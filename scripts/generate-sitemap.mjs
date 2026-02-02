import fs from "fs";
import path from "path";

const baseUrl = "https://twopaws.pet";
const routes = [
  "/",
  "/about",
  "/features",
  "/egypt",
  "/privacy",
  "/terms",
  "/contact",
];

const urls = routes.map((route) =>
  route === "/" ? baseUrl : `${baseUrl}${route}`
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join("\n") +
  "\n</urlset>\n";

const root = process.cwd();
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