import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://twopaws.pet";
const DEFAULT_CURRENCY = "EGP";
const DEFAULT_BRAND = "TwoPaws";
const DEFAULT_FEED_FILENAME = "merchant-feed.xml";

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

const escapeXml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const toFeedText = (value, maxLength = 5000) => {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim();
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
    Object.entries(fields).forEach(([key, fieldValue]) => {
      result[key] = extractFirestoreValue(fieldValue);
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

const fetchCollectionDocs = async (projectId, apiKey, collectionName) => {
  if (!projectId || !apiKey) return [];

  const docs = [];
  let pageToken = "";

  while (true) {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`
    );
    url.searchParams.set("pageSize", "500");
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Merchant feed: failed fetching ${collectionName} (${res.status}).`);
    }

    const data = await res.json();
    const items = Array.isArray(data.documents) ? data.documents : [];
    for (const doc of items) {
      if (!doc?.name) continue;
      const id = doc.name.split("/").pop();
      if (!id) continue;
      docs.push({ id, ...extractFirestoreDocument(doc) });
    }

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

const getFirstString = (source, keys) => {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const normalizeGtin = (value) => {
  if (!value) return undefined;
  const digits = String(value).replace(/\D+/g, "");
  if ([8, 12, 13, 14].includes(digits.length)) return digits;
  return undefined;
};

const resolveSupplierId = (supplierRef) => {
  if (!supplierRef) return undefined;
  if (typeof supplierRef === "string") {
    return supplierRef.split("/").filter(Boolean).pop();
  }
  if (typeof supplierRef === "object" && typeof supplierRef.id === "string") {
    return supplierRef.id;
  }
  return undefined;
};

const getImageUrls = (product, baseUrl) => {
  const raw = product.photo_url;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const resolved = values
    .map((value) => absoluteUrl(baseUrl, value))
    .filter(Boolean);
  if (resolved.length > 0) return resolved;
  return [`${baseUrl}/og-image.webp`];
};

const getOfferPrice = (product) => {
  const regular = coerceNumber(product.price) ?? 0;
  const sale = coerceNumber(product.sale_price);
  if (Boolean(product.on_sale) && sale && sale > 0) return sale;
  return regular;
};

const getRegularPrice = (product) => {
  return coerceNumber(product.price) ?? 0;
};

const resolveAvailability = (quantity) => {
  return quantity > 0 ? "in_stock" : "out_of_stock";
};

const resolveCondition = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("used")) return "used";
  if (raw.includes("refurb")) return "refurbished";
  return "new";
};

const formatPrice = (value, currency) => `${value.toFixed(2)} ${currency}`;

const createTag = (name, value) => {
  if (value === undefined || value === null || value === "") return "";
  return `<${name}>${escapeXml(value)}</${name}>`;
};

const pushTag = (lines, name, value) => {
  const tag = createTag(name, value);
  if (tag) {
    lines.push(`  ${tag}`);
  }
};

const buildItemXml = ({ product, baseUrl, currency, supplierName }) => {
  const title = toFeedText(product.name, 150);
  if (!title) return null;

  const description = toFeedText(
    product.description || "Shop premium pet supplies and accessories at TwoPaws."
  );
  const productLink = `${baseUrl}/shop/product/${product.id}/`;
  const imageUrls = getImageUrls(product, baseUrl);
  const imageLink = imageUrls[0];
  const additionalImages = imageUrls.slice(1, 10);
  const regularPrice = getRegularPrice(product);
  const offerPrice = getOfferPrice(product);
  const price = offerPrice > 0 ? offerPrice : regularPrice;
  if (!(price > 0)) return null;

  const brand =
    getFirstString(product, ["brand", "brand_name", "brandName", "manufacturer", "vendor"]) ||
    supplierName ||
    DEFAULT_BRAND;
  const mpn = getFirstString(product, [
    "mpn",
    "manufacturer_part_number",
    "manufacturerPartNumber",
  ]);
  const gtin = normalizeGtin(
    getFirstString(product, [
      "gtin",
      "gtin8",
      "gtin12",
      "gtin13",
      "gtin14",
      "barcode",
      "barcodeNumber",
      "barcode_number",
      "ean",
      "upc",
    ])
  );
  const productType = getFirstString(product, ["product_type", "categoryName"]);
  const googleProductCategory = getFirstString(product, ["google_product_category"]);
  const quantity = coerceNumber(product.quantity) ?? 0;
  const availability = resolveAvailability(quantity);
  const condition = resolveCondition(
    getFirstString(product, ["condition", "itemCondition", "item_condition"])
  );
  const salePrice =
    regularPrice > 0 && offerPrice > 0 && offerPrice < regularPrice
      ? offerPrice
      : null;

  const lines = [];
  lines.push("<item>");
  pushTag(lines, "g:id", product.id);
  pushTag(lines, "g:title", title);
  pushTag(lines, "g:description", description);
  pushTag(lines, "g:link", productLink);
  pushTag(lines, "g:image_link", imageLink);
  for (const image of additionalImages) {
    pushTag(lines, "g:additional_image_link", image);
  }
  pushTag(lines, "g:availability", availability);
  pushTag(lines, "g:condition", condition);
  pushTag(lines, "g:price", formatPrice(price, currency));
  if (salePrice !== null) {
    pushTag(lines, "g:sale_price", formatPrice(salePrice, currency));
  }
  pushTag(lines, "g:brand", brand);
  pushTag(lines, "g:mpn", mpn);
  pushTag(lines, "g:gtin", gtin);
  pushTag(lines, "g:product_type", productType);
  pushTag(lines, "g:google_product_category", googleProductCategory);
  lines.push("</item>");

  return lines.join("\n");
};

const buildFeedXml = ({ items, baseUrl }) => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    "  <title>TwoPaws Product Feed</title>",
    `  <link>${escapeXml(`${baseUrl}/shop/`)}</link>`,
    "  <description>TwoPaws products for Google Merchant Center.</description>",
    items.map((item) => item.split("\n").map((line) => `  ${line}`).join("\n")).join("\n"),
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
};

const writeMerchantFeed = async () => {
  const root = process.cwd();
  const env = resolveEnv(root);
  const baseUrl = resolveBaseUrl(env);
  const currency = env.VITE_CURRENCY || env.SITE_CURRENCY || DEFAULT_CURRENCY;

  const products = await fetchCollectionDocs(
    env.VITE_FIREBASE_PROJECT_ID,
    env.VITE_FIREBASE_API_KEY,
    "products"
  );
  const suppliers = await fetchCollectionDocs(
    env.VITE_FIREBASE_PROJECT_ID,
    env.VITE_FIREBASE_API_KEY,
    "suppliers"
  );
  const supplierNameById = suppliers.reduce((acc, supplier) => {
    if (supplier?.id && supplier?.name) {
      acc[supplier.id] = String(supplier.name);
    }
    return acc;
  }, {});

  const items = products
    .map((product) => {
      const supplierId = resolveSupplierId(product.supplierRef);
      const supplierName = supplierId ? supplierNameById[supplierId] : undefined;
      return buildItemXml({
        product,
        baseUrl,
        currency,
        supplierName,
      });
    })
    .filter(Boolean);

  const xml = buildFeedXml({ items, baseUrl });
  const distDir = path.join(root, "dist");
  const publicDir = path.join(root, "client", "public");
  const outputDirs = [];

  if (fs.existsSync(distDir)) {
    outputDirs.push(distDir);
  }
  if (fs.existsSync(publicDir)) {
    outputDirs.push(publicDir);
  }
  if (outputDirs.length === 0) {
    throw new Error("Merchant feed: no output directory found.");
  }

  for (const outputDir of outputDirs) {
    fs.writeFileSync(path.join(outputDir, DEFAULT_FEED_FILENAME), xml, "utf8");
  }

  console.log(
    `Merchant feed: wrote ${items.length} item(s) to ${outputDirs.join(", ")}`
  );
};

writeMerchantFeed().catch((err) => {
  console.error("Merchant feed generation failed:", err);
  process.exitCode = 1;
});
