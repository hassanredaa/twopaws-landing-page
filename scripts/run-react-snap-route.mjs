import reactSnap from "react-snap";

const { run } = reactSnap;

const parseInclude = () => {
  const raw = process.env.REACT_SNAP_INCLUDE ?? "";
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const include = parseInclude();
const concurrency = Math.max(
  1,
  Number.parseInt(process.env.REACT_SNAP_CONCURRENCY ?? "2", 10) || 2
);

if (!include.length) {
  console.error("ReactSnap route runner: include list is empty.");
  process.exitCode = 1;
} else {
  try {
    await run({
      source: "dist",
      include,
      crawl: false,
      concurrency,
      puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.error("ReactSnap route runner failed:", err);
    process.exitCode = 1;
  }
}
