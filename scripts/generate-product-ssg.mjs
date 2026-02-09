import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://twopaws.pet";

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split("=");
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
};

const resolveEnv = (root) => {
  const fileEnv = readEnvFile(path.join(root, "client", ".env"));
  return { ...fileEnv, ...process.env };
};

const resolveBaseUrl = (env) =>
  (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toSeoDescription = (value, maxLength = 160) => {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const coerceNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const extractFirestoreValue = (value) => {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number.parseInt(value.integerValue, 10);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values)
      ? value.arrayValue.values
      : [];
    return values.map(extractFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    const result = {};
    Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
      result[fieldKey] = extractFirestoreValue(fieldValue);
    });
    return result;
  }
  if ("nullValue" in value) return null;
  return undefined;
};

const extractFirestoreDocument = (doc) => {
  const fields = doc?.fields ?? {};
  const result = {};
  Object.entries(fields).forEach(([key, value]) => {
    result[key] = extractFirestoreValue(value);
  });
  return result;
};

const fetchProductDocs = async (projectId, apiKey) => {
  if (!projectId || !apiKey) return [];

  const docs = [];
  let pageToken = "";

  while (true) {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`
    );
    url.searchParams.set("pageSize", "500");
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Product SSG fetch failed (${res.status}).`);
    }

    const data = await res.json();
    const items = Array.isArray(data.documents) ? data.documents : [];
    items.forEach((doc) => {
      if (!doc?.name) return;
      const id = doc.name.split("/").pop();
      if (!id) return;
      docs.push({
        id,
        ...extractFirestoreDocument(doc),
      });
    });

    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return docs;
};

const absoluteUrl = (baseUrl, value) => {
  if (!value) return null;
  if (String(value).startsWith("http")) return String(value);
  const normalized = String(value).startsWith("/")
    ? String(value)
    : `/${String(value)}`;
  return `${baseUrl}${normalized}`;
};

const getPrimaryImage = (product, baseUrl) => {
  const raw = product.photo_url;
  if (Array.isArray(raw) && raw.length > 0) return absoluteUrl(baseUrl, raw[0]);
  if (typeof raw === "string") return absoluteUrl(baseUrl, raw);
  return `${baseUrl}/og-image.webp`;
};

const getOfferPrice = (product) => {
  const regular = coerceNumber(product.price) ?? 0;
  const sale = coerceNumber(product.sale_price);
  const onSale = Boolean(product.on_sale);
  if (onSale && sale && sale > 0) return sale;
  return regular;
};

const setTitle = (html, value) => {
  const next = `<title>${escapeHtml(value)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, next);
  }
  return html.replace("</head>", `  ${next}\n</head>`);
};

const upsertMetaByName = (html, name, content) => {
  const next = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(
    `<meta\\s+name=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i"
  );
  if (pattern.test(html)) {
    return html.replace(pattern, next);
  }
  return html.replace("</head>", `  ${next}\n</head>`);
};

const upsertMetaByProperty = (html, property, content) => {
  const next = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(
    `<meta\\s+property=["']${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i"
  );
  if (pattern.test(html)) {
    return html.replace(pattern, next);
  }
  return html.replace("</head>", `  ${next}\n</head>`);
};

const upsertCanonical = (html, canonicalUrl) => {
  const next = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, next);
  }
  return html.replace("</head>", `  ${next}\n</head>`);
};

const upsertStructuredData = (html, id, payload) => {
  const safeJson = JSON.stringify(payload).replaceAll("<", "\\u003c");
  const next = `<script id="${id}" type="application/ld+json">${safeJson}</script>`;
  const pattern = new RegExp(
    `<script[^>]*id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][\\s\\S]*?<\\/script>`,
    "i"
  );
  if (pattern.test(html)) {
    return html.replace(pattern, next);
  }
  return html.replace("</head>", `  ${next}\n</head>`);
};

const buildProductHtml = (template, product, baseUrl) => {
  const productName = String(product.name || "Product");
  const description = toSeoDescription(
    product.description || "Shop premium pet supplies and accessories at TwoPaws."
  );
  const canonicalPath = `/shop/product/${product.id}/`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const imageUrl = getPrimaryImage(product, baseUrl);
  const offerPrice = getOfferPrice(product);
  const quantity = coerceNumber(product.quantity) ?? 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description,
    url: canonicalUrl,
    image: imageUrl ? [imageUrl] : undefined,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "TwoPaws",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: offerPrice,
      availability:
        quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: canonicalUrl,
    },
  };

  let html = template;
  html = setTitle(html, `${productName} | TwoPaws Shop`);
  html = upsertMetaByName(html, "description", description);
  html = upsertCanonical(html, canonicalUrl);
  html = upsertMetaByProperty(html, "og:type", "product");
  html = upsertMetaByProperty(html, "og:title", `${productName} | TwoPaws Shop`);
  html = upsertMetaByProperty(html, "og:description", description);
  html = upsertMetaByProperty(html, "og:url", canonicalUrl);
  html = upsertMetaByProperty(html, "og:image", imageUrl);
  html = upsertMetaByName(html, "twitter:title", `${productName} | TwoPaws Shop`);
  html = upsertMetaByName(html, "twitter:description", description);
  html = upsertMetaByName(html, "twitter:image", imageUrl);
  html = upsertStructuredData(html, "product-jsonld", structuredData);
  return html;
};

const writeProductPages = async () => {
  const root = process.cwd();
  const distDir = path.join(root, "dist");
  const templatePath = path.join(distDir, "index.html");

  if (!fs.existsSync(templatePath)) {
    throw new Error("Product SSG: dist/index.html not found. Run vite build first.");
  }

  const env = resolveEnv(root);
  const baseUrl = resolveBaseUrl(env);
  const template = fs.readFileSync(templatePath, "utf8");
  const productDocs = await fetchProductDocs(
    env.VITE_FIREBASE_PROJECT_ID,
    env.VITE_FIREBASE_API_KEY
  );

  if (!productDocs.length) {
    console.warn("Product SSG: no products found.");
    return;
  }

  for (const product of productDocs) {
    const routeDir = path.join(distDir, "shop", "product", product.id);
    fs.mkdirSync(routeDir, { recursive: true });
    const html = buildProductHtml(template, product, baseUrl);
    fs.writeFileSync(path.join(routeDir, "index.html"), html, "utf8");
  }

  console.log(`Product SSG: generated ${productDocs.length} product page(s).`);
};

writeProductPages().catch((err) => {
  console.error("Product SSG failed:", err);
  process.exitCode = 1;
});
