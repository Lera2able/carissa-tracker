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

console.log(`Prepared static publish directory: ${outDir}`);

