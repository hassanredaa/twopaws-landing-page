const normalize = (value) => String(value ?? "").toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const getSupplierId = (product) =>
  String(product?.supplierRef ?? "").split("/").pop() ?? "";

export const hasProductImage = (product) => Array.isArray(product?.photo_url)
  ? product.photo_url.some(Boolean)
  : Boolean(product?.photo_url);

export const isProductSeoEligible = (product) =>
  normalize(product?.name).length >= 3
  && Number(product?.price) > 0
  && hasProductImage(product)
  && Boolean(getSupplierId(product));

const getSku = (product) => normalize(product?.sku ?? product?.skuStr);
const duplicateKey = (product) => {
  const sku = getSku(product);
  const supplierId = getSupplierId(product);
  return sku && supplierId ? `${supplierId}|${sku}` : "";
};

const qualityScore = (product) => {
  const descriptionLength = normalize(product?.description).length;
  return (Number(product?.quantity) > 0 ? 10_000 : 0)
    + Math.min(descriptionLength, 1_000)
    + (hasProductImage(product) ? 100 : 0);
};

export const buildCatalogSeoPlan = (products) => {
  const eligible = products.filter(isProductSeoEligible);
  const excluded = products.filter((product) => !isProductSeoEligible(product));
  const groups = new Map();
  eligible.forEach((product) => {
    const key = duplicateKey(product);
    if (!key) return;
    const group = groups.get(key) ?? [];
    group.push(product);
    groups.set(key, group);
  });

  const canonicalById = new Map();
  groups.forEach((group) => {
    if (group.length < 2) return;
    const ranked = [...group].sort((a, b) => {
      const scoreDifference = qualityScore(b) - qualityScore(a);
      return scoreDifference || String(a.id).localeCompare(String(b.id));
    });
    const canonicalId = ranked[0].id;
    ranked.slice(1).forEach((product) => canonicalById.set(product.id, canonicalId));
  });

  return {
    eligible,
    excluded,
    canonicalById,
    sitemapProducts: eligible.filter((product) => !canonicalById.has(product.id)),
  };
};

export const buildSeoDescription = (product) => {
  const existing = String(product?.description ?? "").replace(/\s+/g, " ").trim();
  if (existing.length >= 20) return existing;
  const name = String(product?.name ?? "Pet product").trim();
  const brand = String(product?.brand ?? "").trim();
  const brandText = brand ? ` by ${brand}` : "";
  return `Buy ${name}${brandText} online from TwoPaws in Egypt. Check current price, availability and delivery options.`;
};
