import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const DEFAULT_MAX_PRODUCT_ROUTES = 0;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_PRODUCT_FAILURES = 3;
const STATIC_ROUTES = [
  "/",
  "/about",
  "/features",
  "/egypt",
  "/privacy",
  "/terms",
  "/contact",
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

const resolveEnv = () => {
  const root = process.cwd();
  const fileEnv = readEnvFile(path.join(root, "client", ".env"));
  return { ...fileEnv, ...process.env };
};

const resolveNumberOption = (rawValue, fallback) => {
  if (!rawValue && rawValue !== 0) return fallback;
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const resolveMaxProductRoutes = (env) => {
  const raw = env.REACT_SNAP_MAX_PRODUCTS ?? env.VITE_REACT_SNAP_MAX_PRODUCTS;
  if (!raw && raw !== 0) return DEFAULT_MAX_PRODUCT_ROUTES;
  if (String(raw).toLowerCase() === "all") return Number.POSITIVE_INFINITY;
  return resolveNumberOption(raw, DEFAULT_MAX_PRODUCT_ROUTES);
};

const resolveConcurrency = (env) => {
  return Math.max(
    1,
    resolveNumberOption(
      env.REACT_SNAP_CONCURRENCY ?? env.VITE_REACT_SNAP_CONCURRENCY,
      DEFAULT_CONCURRENCY
    )
  );
};

const resolveFailOnRouteError = (env) => {
  const raw =
    env.REACT_SNAP_FAIL_ON_ROUTE_ERROR ??
    env.VITE_REACT_SNAP_FAIL_ON_ROUTE_ERROR ??
    "";
  return String(raw).toLowerCase() === "true";
};

const resolveMaxProductFailures = (env) => {
  return Math.max(
    1,
    resolveNumberOption(
      env.REACT_SNAP_MAX_PRODUCT_FAILURES ??
        env.VITE_REACT_SNAP_MAX_PRODUCT_FAILURES,
      DEFAULT_MAX_PRODUCT_FAILURES
    )
  );
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
      docs.set(id, {
        id,
        updatedAt: doc.updateTime || doc.createTime || "",
      });
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return Array.from(docs.values());
};

const buildRoutePlan = async (env) => {
  const maxProductRoutes = resolveMaxProductRoutes(env);
  const concurrency = resolveConcurrency(env);
  const failOnRouteError = resolveFailOnRouteError(env);
  const maxProductFailures = resolveMaxProductFailures(env);
  let productRoutes = [];

  if (maxProductRoutes > 0 || maxProductRoutes === Number.POSITIVE_INFINITY) {
    try {
      const productDocs = await fetchProductDocs(
        env.VITE_FIREBASE_PROJECT_ID,
        env.VITE_FIREBASE_API_KEY
      );
      const sortedDocs = [...productDocs].sort((a, b) =>
        String(b.updatedAt).localeCompare(String(a.updatedAt))
      );
      const selectedDocs =
        maxProductRoutes === Number.POSITIVE_INFINITY
          ? sortedDocs
          : sortedDocs.slice(0, maxProductRoutes);

      productRoutes = selectedDocs.map((doc) => `/shop/product/${doc.id}`);
      if (selectedDocs.length < productDocs.length) {
        console.log(
          `ReactSnap: limiting product prerender routes to ${selectedDocs.length}/${productDocs.length}.`
        );
      }
    } catch (err) {
      console.warn("ReactSnap: unable to load product routes.", err);
    }
  }

  return {
    staticRoutes: [...STATIC_ROUTES],
    productRoutes: Array.from(new Set(productRoutes)),
    concurrency,
    failOnRouteError,
    maxProductFailures,
  };
};

const removeReactSnapSentinel = () => {
  const sentinelPath = path.join(process.cwd(), "dist", "200.html");
  if (fs.existsSync(sentinelPath)) {
    fs.unlinkSync(sentinelPath);
  }
};

const runRouteGroup = ({ include, concurrency }) => {
  removeReactSnapSentinel();
  const helperScript = path.join(process.cwd(), "scripts", "run-react-snap-route.mjs");
  const childEnv = {
    ...process.env,
    REACT_SNAP_INCLUDE: JSON.stringify(include),
    REACT_SNAP_CONCURRENCY: String(concurrency),
  };
  const result = spawnSync(process.execPath, [helperScript], {
    stdio: "inherit",
    env: childEnv,
  });
  return result.status === 0;
};

const runReactSnap = async () => {
  const env = resolveEnv();
  const {
    staticRoutes,
    productRoutes,
    concurrency,
    failOnRouteError,
    maxProductFailures,
  } =
    await buildRoutePlan(env);

  if (!staticRoutes.length && !productRoutes.length) {
    throw new Error("ReactSnap: include list is empty.");
  }

  const failedRoutes = [];

  if (staticRoutes.length) {
    const ok = runRouteGroup({ include: staticRoutes, concurrency });
    if (!ok) {
      failedRoutes.push(...staticRoutes);
      console.warn("ReactSnap: static route prerender failed.");
    } else {
      console.log(`ReactSnap: prerendered static routes (${staticRoutes.length}).`);
    }
  }

  let productFailures = 0;
  for (const route of productRoutes) {
    const ok = runRouteGroup({ include: [route], concurrency: 1 });
    if (!ok) {
      failedRoutes.push(route);
      productFailures += 1;
      console.warn(`ReactSnap: failed route ${route}`);
      if (productFailures >= maxProductFailures) {
        const remaining = Math.max(productRoutes.length - failedRoutes.length, 0);
        console.warn(
          `ReactSnap: stopping product prerender after ${productFailures} failures. ${remaining} route(s) skipped.`
        );
        break;
      }
    }
  }

  if (failedRoutes.length) {
    console.warn(
      `ReactSnap: completed with ${failedRoutes.length} failed route(s).`
    );
    if (failOnRouteError) {
      throw new Error(
        `ReactSnap: REACT_SNAP_FAIL_ON_ROUTE_ERROR=true and ${failedRoutes.length} route(s) failed.`
      );
    }
  }
};

runReactSnap().catch((err) => {
  console.error("ReactSnap failed:", err);
  process.exitCode = 1;
});
