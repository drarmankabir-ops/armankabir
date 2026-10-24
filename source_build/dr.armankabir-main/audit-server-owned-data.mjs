#!/usr/bin/env node
/**
 * Fails when frontend features reintroduce browser-backed persistence.
 * The one-time migration importer is isolated in storageAdapter.ts; runtime
 * reads and writes use authenticated PHP APIs with an in-memory cache.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src/frontend/src");
const ignored = new Set([
  "SERVER_OWNED_DATA.md",
  "STORAGE_AUDIT_REPORT.md",
  "serverOwnedData.ts",
  "storageAdapter.ts",
]);
const forbidden = [
  /\b(?:window\.)?localStorage\s*\.(?:getItem|setItem|removeItem|clear|key|length)\b/g,
  /\b(?:window\.)?sessionStorage\s*\.(?:getItem|setItem|removeItem|clear|key|length)\b/g,
  /\bindexedDB\s*\.(?:open|deleteDatabase)\b/g,
  /\bdocument\.cookie\s*=/g,
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(fullPath)));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const violations = [];
for (const file of await filesIn(root)) {
  if (ignored.has(path.basename(file))) continue;
  const source = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${path.relative(process.cwd(), file)}:${line}: ${match[0]}`);
    }
  }
}

if (violations.length) {
  console.error("Browser persistence audit failed. Use PHP APIs for persistent data:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Server-owned data audit passed.");
}
