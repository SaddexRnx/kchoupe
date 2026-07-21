#!/usr/bin/env node
/**
 * Lightweight crawl simulation.
 *
 * Starts from the public homepage + sitemap.xml, follows same-origin links
 * up to MAX_DEPTH, and verifies that:
 *   1. No authenticated route is reachable via a public link (i.e. no leak).
 *   2. Every private route that IS fetched serves noindex protections
 *      (meta robots + X-Robots-Tag) — matching a real crawler's perspective.
 *   3. robots.txt Disallow entries cover every private path we know about.
 *   4. sitemap.xml never advertises a private URL.
 */
import { load } from "cheerio";

const BASE = process.env.CRAWL_BASE ?? "http://localhost:8080";
const MAX_DEPTH = 2;
const MAX_PAGES = 60;

const PRIVATE_PATHS = [
  "/admin", "/dashboard", "/ai-employees", "/products", "/orders",
  "/conversations", "/knowledge", "/integrations", "/playground",
  "/settings", "/support", "/onboarding",
  "/login", "/signup", "/reset-password",
];

const isPrivate = (path) =>
  PRIVATE_PATHS.some((p) => path === p || path.startsWith(p + "/"));

const seen = new Set();
const queue = [{ url: `${BASE}/`, depth: 0, from: "(entry)" }];
const publicLeaks = [];   // private URLs linked from a public page
const fetchedPrivate = []; // private URLs we actually retrieved

async function fetchText(url) {
  const r = await fetch(url, { redirect: "manual" });
  const text = r.headers.get("content-type")?.includes("text/") ? await r.text() : "";
  return { status: r.status, headers: r.headers, text };
}

// 1) crawl from the homepage
while (queue.length && seen.size < MAX_PAGES) {
  const { url, depth, from } = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);

  let res;
  try { res = await fetchText(url); }
  catch (e) { console.warn("fetch failed", url, e.message); continue; }

  const path = new URL(url).pathname;

  if (isPrivate(path)) {
    publicLeaks.push({ url, from });
    continue; // don't recurse into private pages via link discovery
  }
  if (depth >= MAX_DEPTH) continue;

  const $ = load(res.text);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let next;
    try { next = new URL(href, url); } catch { return; }
    if (next.origin !== new URL(BASE).origin) return;
    next.hash = "";
    if (!seen.has(next.href)) queue.push({ url: next.href, depth: depth + 1, from: url });
  });
}

// 2) also parse sitemap.xml
const sitemapUrls = [];
try {
  const sm = await fetchText(`${BASE}/sitemap.xml`);
  for (const m of sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.push(m[1]);
} catch {}
const sitemapLeaks = sitemapUrls.filter((u) => {
  try { return isPrivate(new URL(u).pathname); } catch { return false; }
});

// 3) verify robots.txt covers every private path
const robots = await fetchText(`${BASE}/robots.txt`);
const disallowed = new Set(
  robots.text.split("\n").map((l) => l.trim())
    .filter((l) => l.toLowerCase().startsWith("disallow:"))
    .map((l) => l.slice("disallow:".length).trim())
);
const missingFromRobots = PRIVATE_PATHS.filter((p) => !disallowed.has(p));

// 4) verify each private route (fetched directly, not via link) sends noindex
for (const p of PRIVATE_PATHS) {
  const url = `${BASE}${p}`;
  try {
    const r = await fetchText(url);
    const xrt = r.headers.get("x-robots-tag") ?? "";
    const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(r.text);
    fetchedPrivate.push({
      path: p,
      status: r.status,
      xRobotsTag: xrt,
      metaNoindex,
      ok: (xrt.includes("noindex") || metaNoindex),
    });
  } catch (e) {
    fetchedPrivate.push({ path: p, error: e.message, ok: false });
  }
}

// --- report --------------------------------------------------------------
const bad = [];
console.log(`\n== Crawl simulation @ ${BASE} ==`);
console.log(`Pages visited: ${seen.size}`);
console.log(`Sitemap URLs : ${sitemapUrls.length}`);

console.log("\n[1] Private URLs linked from public pages:");
if (publicLeaks.length === 0) console.log("  ✅ none — search engines cannot discover authenticated routes.");
else { publicLeaks.forEach((l) => console.log("  ❌", l.url, "← linked from", l.from)); bad.push("public-link-leak"); }

console.log("\n[2] Private URLs advertised in sitemap.xml:");
if (sitemapLeaks.length === 0) console.log("  ✅ none.");
else { sitemapLeaks.forEach((u) => console.log("  ❌", u)); bad.push("sitemap-leak"); }

console.log("\n[3] robots.txt Disallow coverage:");
if (missingFromRobots.length === 0) console.log("  ✅ every private path is disallowed.");
else { missingFromRobots.forEach((p) => console.log("  ❌ missing Disallow:", p)); bad.push("robots-coverage"); }

console.log("\n[4] noindex protection when private routes are fetched directly:");
for (const r of fetchedPrivate) {
  const mark = r.ok ? "✅" : "❌";
  console.log(`  ${mark} ${r.path} status=${r.status} X-Robots-Tag="${r.xRobotsTag}" meta-noindex=${r.metaNoindex}`);
  if (!r.ok) bad.push("noindex-missing:" + r.path);
}

console.log("\n== Result ==");
if (bad.length === 0) { console.log("✅ PASS — no discoverable authenticated pages."); process.exit(0); }
console.log("❌ FAIL:", bad.join(", ")); process.exit(1);
