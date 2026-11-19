import { promises as fs } from "fs";
import path from "path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "site-dist");

const EXCLUDED_DIRS = new Set([
  ".git",
  ".github",
  "cloudflare-ai-worker",
  "supabase",
  "site-dist",
  "node_modules",
]);

const ALLOWED_EXTS = new Set([
  ".html",
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".txt",
  ".json",
  ".xml",
  ".pdf",
]);

async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyRecursive(srcDir, destDir, rel = "") {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = rel ? path.join(rel, entry.name) : entry.name;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, relPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(relPath) || EXCLUDED_DIRS.has(entry.name)) continue;
      await fs.mkdir(destPath, { recursive: true });
      await copyRecursive(srcPath, destDir, relPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(srcPath, destPath);
  }
}

await ensureCleanDir(outDir);
await copyRecursive(repoRoot, outDir);

// Inject the SPIP dashboard button loader into the published index.html.
// (The teacher dashboard is rendered by the bundled app.js; spip-button.js
// adds the SPIP card to it at runtime. Editing index.html here keeps the
// 1 MB bundle untouched.)
const indexPath = path.join(outDir, "index.html");
let indexHtml = await fs.readFile(indexPath, "utf8");
const SPIP_TAG = '<script src="./spip-button.js?v=20261120noappendix"></script>';
if (!indexHtml.includes("spip-button.js")) {
  const marker = indexHtml.match(/<script src="\.\/app\.js[^"]*"><\/script>/);
  if (!marker) throw new Error("app.js script tag not found in index.html");
  indexHtml = indexHtml.replace(marker[0], marker[0] + "\n" + SPIP_TAG);
  await fs.writeFile(indexPath, indexHtml);
  console.log("Injected spip-button.js into index.html");
}

console.log(`Prepared static publish directory: ${outDir}`);
