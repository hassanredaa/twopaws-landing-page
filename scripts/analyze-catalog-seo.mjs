import fs from "fs";
import path from "path";

const readEnv = () => {
  const file = path.join(process.cwd(), "client", ".env");
  if (!fs.existsSync(file)) return process.env;
  const values = Object.fromEntries(
    fs.readFileSync(file, "utf8").split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").trim()];
      }),
  );
  return { ...values, ...process.env };
};

const extract = (value) => {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(extract);
  if ("mapValue" in value) return Object.fromEntries(
    Object.entries(value.mapValue?.fields ?? {}).map(([key, child]) => [key, extract(child)]),
  );
  if ("nullValue" in value) return null;
  return undefined;
};

const fetchProducts = async (projectId, apiKey) => {
  const products = [];
  let pageToken = "";
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`);
    url.searchParams.set("pageSize", "500");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Catalog fetch failed (${response.status})`);
    const payload = await response.json();
    for (const document of payload.documents ?? []) {
      const id = document.name?.split("/").pop();
      if (!id) continue;
      products.push({
        id,
        ...Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, extract(value)])),
      });
    }
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  return products;
};

const normalize = (value) => String(value ?? "").toLowerCase()
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();
const supplierId = (product) => String(product.supplierRef ?? "").split("/").pop() ?? "";
const hasImage = (product) => Array.isArray(product.photo_url)
  ? product.photo_url.some(Boolean)
  : Boolean(product.photo_url);
const activeValue = (product) => product.isActive ?? product.is_active ?? product.active ?? product.published;
const statusValue = (product) => normalize(product.status ?? product.productStatus);
const duplicateKey = (product) => [normalize(product.name), normalize(product.brand ?? product.brand_name), supplierId(product)].join("|");
const globalDuplicateKey = (product) => [normalize(product.name), normalize(product.brand ?? product.brand_name)].join("|");
const skuDuplicateKey = (product) => [normalize(product.sku ?? product.skuStr), supplierId(product)].join("|");

const env = readEnv();
const products = await fetchProducts(env.VITE_FIREBASE_PROJECT_ID, env.VITE_FIREBASE_API_KEY);
const fieldCounts = new Map();
const statuses = new Map();
for (const product of products) {
  Object.keys(product).forEach((key) => fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1));
  const status = statusValue(product) || "<missing>";
  statuses.set(status, (statuses.get(status) ?? 0) + 1);
}
const groups = new Map();
for (const product of products) {
  const key = duplicateKey(product);
  if (!normalize(product.name)) continue;
  const group = groups.get(key) ?? [];
  group.push(product);
  groups.set(key, group);
}
const duplicates = [...groups.values()].filter((group) => group.length > 1);
const globalGroups = new Map();
for (const product of products) {
  const key = globalDuplicateKey(product);
  if (!normalize(product.name)) continue;
  const group = globalGroups.get(key) ?? [];
  group.push(product);
  globalGroups.set(key, group);
}
const globalDuplicates = [...globalGroups.values()].filter((group) => group.length > 1);
const skuGroups = new Map();
for (const product of products) {
  const key = skuDuplicateKey(product);
  if (!normalize(product.sku ?? product.skuStr)) continue;
  const group = skuGroups.get(key) ?? [];
  group.push(product);
  skuGroups.set(key, group);
}
const skuDuplicates = [...skuGroups.values()].filter((group) => group.length > 1);
const summary = {
  total: products.length,
  missingName: products.filter((p) => normalize(p.name).length < 3).length,
  missingDescription: products.filter((p) => normalize(p.description).length < 20).length,
  missingImage: products.filter((p) => !hasImage(p)).length,
  invalidPrice: products.filter((p) => !(Number(p.price) > 0)).length,
  outOfStock: products.filter((p) => !(Number(p.quantity) > 0)).length,
  explicitlyInactive: products.filter((p) => activeValue(p) === false).length,
  duplicateGroupsSameSupplier: duplicates.length,
  duplicateDocumentsSameSupplier: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
  duplicateGroupsAcrossSuppliers: globalDuplicates.length,
  duplicateDocumentsAcrossSuppliers: globalDuplicates.reduce((sum, group) => sum + group.length - 1, 0),
  duplicateSkuGroupsSameSupplier: skuDuplicates.length,
  duplicateSkuDocumentsSameSupplier: skuDuplicates.reduce((sum, group) => sum + group.length - 1, 0),
  largestDuplicateGroups: duplicates
    .sort((a, b) => b.length - a.length)
    .slice(0, 20)
    .map((group) => ({ key: duplicateKey(group[0]), count: group.length, ids: group.map((p) => p.id) })),
  statuses: Object.fromEntries([...statuses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)),
  commonFields: Object.fromEntries([...fieldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)),
};
console.log(JSON.stringify(summary, null, 2));
