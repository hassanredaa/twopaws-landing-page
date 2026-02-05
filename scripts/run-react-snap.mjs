import fs from "fs";
import path from "path";
import reactSnap from "react-snap";

const { run } = reactSnap;

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
      console.warn(`ReactSnap: Firestore fetch failed (${res.status}).`);
      return Array.from(docs.values());
    }
    const data = await res.json();
    const items = Array.isArray(data.documents) ? data.documents : [];
    for (const doc of items) {
      if (!doc?.name) continue;
      const id = doc.name.split("/").pop();
      if (!id) continue;
      docs.set(id, id);
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return Array.from(docs.values());
};

const buildIncludeRoutes = async () => {
  const root = process.cwd();
  const env = resolveEnv(root);

  let productRoutes = [];
  try {
    const productIds = await fetchProductDocs(
      env.VITE_FIREBASE_PROJECT_ID,
      env.VITE_FIREBASE_API_KEY
    );
    productRoutes = productIds.map((id) => `/shop/product/${id}`);
  } catch (err) {
    console.warn("ReactSnap: unable to load product routes.", err);
  }

  const routes = [...STATIC_ROUTES, ...productRoutes];
  return Array.from(new Set(routes));
};

const runReactSnap = async () => {
  const include = await buildIncludeRoutes();
  if (!include.length) {
    throw new Error("ReactSnap: include list is empty.");
  }

  await run({
    source: "dist",
    include,
    crawl: false,
    puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

runReactSnap().catch((err) => {
  console.error("ReactSnap failed:", err);
  process.exitCode = 1;
});
