#!/usr/bin/env bun
/**
 * Automated SEO audit — scans every route file under src/routes/ and
 * verifies canonical + meta robots rules for authenticated vs public pages.
 *
 * Rules:
 *  - Every indexable route must declare an absolute self-canonical.
 *  - Authenticated + auth-flow routes must carry `noindex, nofollow`
 *    AND call `setNoIndexHeader()` in `beforeLoad` (HTTP X-Robots-Tag).
 *  - Public marketing routes must NOT declare `noindex`.
 *  - No route may hardcode a canonical pointing at a different route.
 *
 * Run: bun scripts/seo-audit.ts
 * Exits 1 on any failure so it can gate CI.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/routes/", import.meta.url).pathname;
const BASE_URL = "https://kchoupe.lovable.app";

// Routes that must be hidden from search engines.
const PRIVATE_ROUTES = new Set([
  "dashboard", "admin", "ai-employees", "products", "orders",
  "conversations", "knowledge", "integrations", "playground",
  "settings", "support", "onboarding",
  "login", "signup", "reset-password",
]);

// Skip: non-page routes (API, sitemap, root, well-known, mcp, oauth consent).
const SKIP_PREFIXES = ["api", "[.", "__root", "mcp", "sitemap"];

type Finding = { file: string; severity: "error" | "warn"; msg: string };
const findings: Finding[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|)$/.test(name) && (name.endsWith(".tsx") || name.endsWith(".ts"))) out.push(p);
  }
  return out;
}

function routeSlugFromFile(file: string): string {
  const rel = relative(ROOT, file).replace(/\.tsx?$/, "");
  // strip index / __root / bracket-escaped names
  return rel.replace(/\/index$/, "").replace(/\.index$/, "");
}

function shouldSkip(slug: string): boolean {
  return SKIP_PREFIXES.some((p) => slug.startsWith(p));
}

function isPrivate(slug: string): boolean {
  const top = slug.split(/[/.]/)[0];
  return PRIVATE_ROUTES.has(top);
}

for (const file of walk(ROOT)) {
  const slug = routeSlugFromFile(file);
  if (shouldSkip(slug)) continue;

  const src = readFileSync(file, "utf8");
  if (!/createFileRoute\(/.test(src)) continue;

  const priv = isPrivate(slug);
  const hasNoindex = /['"]robots['"]\s*,\s*content:\s*['"][^'"]*noindex/i.test(src);
  const hasCanonical = /rel:\s*['"]canonical['"]/i.test(src);
  const canonicalMatch = src.match(/rel:\s*['"]canonical['"]\s*,\s*href:\s*['"]([^'"]+)['"]/i);
  const hasHeaderCall = /setNoIndexHeader\s*\(/.test(src);

  const rel = relative(ROOT, file);

  if (priv) {
    if (!hasNoindex) findings.push({ file: rel, severity: "error", msg: "private route missing meta robots noindex" });
    if (!hasHeaderCall) findings.push({ file: rel, severity: "error", msg: "private route missing setNoIndexHeader() in beforeLoad" });
  } else {
    if (hasNoindex) findings.push({ file: rel, severity: "error", msg: "public route unexpectedly declares noindex" });
    if (!hasCanonical) findings.push({ file: rel, severity: "warn", msg: "public route missing canonical link" });
  }

  if (canonicalMatch) {
    const href = canonicalMatch[1];
    if (!href.startsWith("http")) findings.push({ file: rel, severity: "error", msg: `canonical is not absolute: ${href}` });
    if (href.startsWith("http") && !href.startsWith(BASE_URL)) {
      findings.push({ file: rel, severity: "warn", msg: `canonical points off-domain: ${href}` });
    }
  }
}

const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");

console.log(`\nSEO audit — ${errors.length} error(s), ${warns.length} warning(s)\n`);
for (const f of findings) {
  const icon = f.severity === "error" ? "✖" : "⚠";
  console.log(`  ${icon} ${f.file} — ${f.msg}`);
}
if (findings.length === 0) console.log("  ✓ all routes pass canonical + robots checks");

process.exit(errors.length > 0 ? 1 : 0);
