import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://twopaws.pet";
const DEFAULT_OG_IMAGE = "/og-image.webp";

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

const fetchSupplierDocs = async (projectId, apiKey) => {
  if (!projectId || !apiKey) return [];

  const docs = [];
  let pageToken = "";

  while (true) {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/suppliers`
    );
    url.searchParams.set("pageSize", "500");
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Shop SSG supplier fetch failed (${res.status}).`);
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

const applyCoreSeo = ({
  html,
  baseUrl,
  title,
  description,
  canonicalPath,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
}) => {
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const ogImageUrl = absoluteUrl(baseUrl, ogImage);

  let next = html;
  next = setTitle(next, title);
  next = upsertMetaByName(next, "description", description);
  next = upsertCanonical(next, canonicalUrl);
  next = upsertMetaByProperty(next, "og:site_name", "TwoPaws");
  next = upsertMetaByProperty(next, "og:type", ogType);
  next = upsertMetaByProperty(next, "og:title", title);
  next = upsertMetaByProperty(next, "og:description", description);
  next = upsertMetaByProperty(next, "og:url", canonicalUrl);
  if (ogImageUrl) {
    next = upsertMetaByProperty(next, "og:image", ogImageUrl);
    next = upsertMetaByName(next, "twitter:image", ogImageUrl);
  }
  next = upsertMetaByName(next, "twitter:card", "summary_large_image");
  next = upsertMetaByName(next, "twitter:title", title);
  next = upsertMetaByName(next, "twitter:description", description);
  return next;
};

const buildShopIndexHtml = (template, baseUrl) => {
  const title = "TwoPaws Shop | Pet Food, Supplies & Accessories in Egypt";
  const description = toSeoDescription(
    "Shop pet food, accessories, litter, toys, and wellness essentials from trusted TwoPaws suppliers in Egypt."
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "TwoPaws Shop",
    description,
    url: `${baseUrl}/shop`,
  };

  let html = applyCoreSeo({
    html: template,
    baseUrl,
    title,
    description,
    canonicalPath: "/shop",
  });
  html = upsertStructuredData(html, "shop-jsonld", structuredData);
  return html;
};

const buildSuppliersIndexHtml = (template, baseUrl, suppliers) => {
  const title = "Supplier Shops | TwoPaws Shop";
  const description = toSeoDescription(
    "Browse all verified TwoPaws supplier shops and explore pet products available for delivery in Egypt."
  );

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "TwoPaws Suppliers",
      description,
      url: `${baseUrl}/shop/suppliers`,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "TwoPaws supplier shops",
      numberOfItems: suppliers.length,
      itemListElement: suppliers.slice(0, 100).map((supplier, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: supplier.name || `Supplier ${index + 1}`,
        url: `${baseUrl}/shop/supplier/${supplier.id}`,
      })),
    },
  ];

  let html = applyCoreSeo({
    html: template,
    baseUrl,
    title,
    description,
    canonicalPath: "/shop/suppliers",
  });
  html = upsertStructuredData(html, "suppliers-jsonld", structuredData);
  return html;
};

const buildSupplierHtml = (template, baseUrl, supplier) => {
  const supplierName = String(supplier.name || "Supplier");
  const title = `${supplierName} | TwoPaws Supplier Shop`;
  const description = toSeoDescription(
    `Shop ${supplierName} on TwoPaws for pet food, accessories, and essentials with delivery in Egypt.`
  );
  const canonicalPath = `/shop/supplier/${supplier.id}`;
  const logo =
    supplier.logo_url || supplier.logoUrl || supplier.logo || DEFAULT_OG_IMAGE;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: supplierName,
    url: `${baseUrl}${canonicalPath}`,
    image: [absoluteUrl(baseUrl, logo)],
  };

  let html = applyCoreSeo({
    html: template,
    baseUrl,
    title,
    description,
    canonicalPath,
    ogType: "website",
    ogImage: logo,
  });
  html = upsertStructuredData(html, "supplier-jsonld", structuredData);
  return html;
};

const writeShopPages = async () => {
  const root = process.cwd();
  const distDir = path.join(root, "dist");
  const templatePath = path.join(distDir, "index.html");

  if (!fs.existsSync(templatePath)) {
    throw new Error("Shop SSG: dist/index.html not found. Run vite build first.");
  }

  const env = resolveEnv(root);
  const baseUrl = resolveBaseUrl(env);
  const template = fs.readFileSync(templatePath, "utf8");

  let suppliers = [];
  try {
    suppliers = await fetchSupplierDocs(
      env.VITE_FIREBASE_PROJECT_ID,
      env.VITE_FIREBASE_API_KEY
    );
  } catch (err) {
    console.warn("Shop SSG: unable to load suppliers.", err);
  }

  const shopDir = path.join(distDir, "shop");
  const suppliersDir = path.join(shopDir, "suppliers");
  fs.mkdirSync(shopDir, { recursive: true });
  fs.mkdirSync(suppliersDir, { recursive: true });

  fs.writeFileSync(
    path.join(shopDir, "index.html"),
    buildShopIndexHtml(template, baseUrl),
    "utf8"
  );
  fs.writeFileSync(
    path.join(suppliersDir, "index.html"),
    buildSuppliersIndexHtml(template, baseUrl, suppliers),
    "utf8"
  );

  for (const supplier of suppliers) {
    const routeDir = path.join(shopDir, "supplier", supplier.id);
    fs.mkdirSync(routeDir, { recursive: true });
    const html = buildSupplierHtml(template, baseUrl, supplier);
    fs.writeFileSync(path.join(routeDir, "index.html"), html, "utf8");
  }

  console.log(`Shop SSG: generated ${suppliers.length} supplier page(s).`);
};

writeShopPages().catch((err) => {
  console.error("Shop SSG failed:", err);
  process.exitCode = 1;
});
