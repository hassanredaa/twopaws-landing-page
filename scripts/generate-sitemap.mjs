import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://twopaws.pet";
const STATIC_ROUTES = [
  "/",
  "/about",
  "/features",
  "/egypt",
  "/privacy",
  "/terms",
  "/contact",
  "/shop",
  "/shop/suppliers",
];

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

const toLastMod = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const fetchProductDocs = async (projectId, apiKey) => {
  if (!projectId || !apiKey) return [];
  const docs = new Map();
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
      console.warn(`Sitemap: Firestore fetch failed (${res.status}).`);
      return Array.from(docs.values());
    }
    const data = await res.json();
    const items = Array.isArray(data.documents) ? data.documents : [];
    for (const doc of items) {
      if (!doc?.name) continue;
      const id = doc.name.split("/").pop();
      if (!id) continue;
      const lastmod = toLastMod(doc.updateTime) || toLastMod(doc.createTime);
      docs.set(id, { id, lastmod });
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return Array.from(docs.values());
};

const buildSitemap = async () => {
  const root = process.cwd();
  const env = resolveEnv(root);
  const baseUrl = (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );

  let productRoutes = [];
  try {
    const productDocs = await fetchProductDocs(
      env.VITE_FIREBASE_PROJECT_ID,
      env.VITE_FIREBASE_API_KEY
    );
    productRoutes = productDocs.map((doc) => ({
      path: `/shop/product/${doc.id}`,
      lastmod: doc.lastmod,
    }));
  } catch (err) {
    console.warn("Sitemap: unable to load product routes.", err);
  }

  const buildLastMod = new Date().toISOString();
  const staticRoutes = STATIC_ROUTES.map((route) => ({
    path: route,
    lastmod: buildLastMod,
  }));
  const allRoutes = [...staticRoutes, ...productRoutes];
  const unique = new Map();
  for (const route of allRoutes) {
    if (!route?.path) continue;
    if (!unique.has(route.path)) {
      unique.set(route.path, route);
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    Array.from(unique.values())
      .map((route) => {
        const loc = route.path === "/" ? baseUrl : `${baseUrl}${route.path}`;
        const lastmod = route.lastmod ? `<lastmod>${route.lastmod}</lastmod>` : "";
        return `  <url><loc>${loc}</loc>${lastmod}</url>`;
      })
      .join("\n") +
    "\n</urlset>\n";

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
    throw new Error("No output directory found for sitemap generation.");
  }

  for (const dir of outputDirs) {
    fs.writeFileSync(path.join(dir, "sitemap.xml"), xml, "utf8");
  }

  console.log(`Sitemap written to: ${outputDirs.join(", ")}`);
};

buildSitemap().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exitCode = 1;
});
