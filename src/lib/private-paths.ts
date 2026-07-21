// Single source of truth for indexing policy.
//
// We use an ALLOWLIST of public/indexable paths rather than a denylist of
// private ones. That way any newly added route is treated as private by
// default and automatically inherits the noindex header from the global
// middleware in src/start.ts — no per-route wiring required.
//
// Add a path here only when the page is intentionally public and should be
// crawlable by search engines. Auth flows (/login, /signup, /reset-password)
// are intentionally NOT public — they are noindex.

/** Exact-match indexable paths. */
export const PUBLIC_INDEXABLE_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/security",
  "/status",
  "/sitemap",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
]);

/** Prefixes whose subtree is indexable (e.g., blog posts). */
export const PUBLIC_INDEXABLE_PREFIXES: readonly string[] = [
  "/blog",
  "/store",
];

/** Paths the middleware should ignore entirely (assets, framework internals). */
const IGNORED_PREFIXES: readonly string[] = [
  "/_build/",
  "/assets/",
  "/@vite",
  "/@fs/",
  "/@id/",
  "/node_modules/",
  "/src/",
];

export type IndexPolicy = "index" | "noindex" | "ignore";

/** Decide the indexing policy for a request path. */
export function classifyPath(pathname: string): IndexPolicy {
  if (IGNORED_PREFIXES.some((p) => pathname.startsWith(p))) return "ignore";
  // Files with an extension (favicon.ico, .png, .js, .css…) — let hosting decide.
  if (/\.[a-z0-9]{1,8}$/i.test(pathname) && !PUBLIC_INDEXABLE_PATHS.has(pathname)) {
    return "ignore";
  }
  if (PUBLIC_INDEXABLE_PATHS.has(pathname)) return "index";
  if (PUBLIC_INDEXABLE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}.`))) {
    return "index";
  }
  return "noindex";
}
