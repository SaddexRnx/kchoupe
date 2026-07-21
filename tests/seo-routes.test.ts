/**
 * Automated SEO gate — validates canonical URLs and noindex/robots rules
 * for every route file under src/routes/. Fails the test run before build
 * so regressions are caught in CI.
 *
 * Rules (mirrors scripts/seo-audit.ts):
 *  - Public routes: absolute self-canonical, no `noindex`.
 *  - Private/auth routes: `noindex, nofollow` meta AND `setNoIndexHeader()`
 *    in `beforeLoad` for the HTTP `X-Robots-Tag`.
 *  - Canonicals must be absolute and on the project domain.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/routes/", import.meta.url).pathname;
const BASE_URL = "https://kchoupe.lovable.app";

const PRIVATE_ROUTES = new Set([
  "dashboard", "admin", "ai-employees", "products", "orders",
  "conversations", "knowledge", "integrations", "playground",
  "settings", "support", "onboarding",
  "login", "signup", "reset-password",
]);

const SKIP_PREFIXES = ["api", "[.", "__root", "mcp", "sitemap"];

// Key routes we require to be covered — guarantees regressions in these
// high-traffic surfaces surface immediately even if the walker misses them.
const REQUIRED_PUBLIC = ["index", "about", "contact", "terms", "privacy", "security", "status"];
const REQUIRED_PRIVATE = ["dashboard", "admin", "settings", "login", "signup"];

type Route = {
  file: string;
  slug: string;
  src: string;
  priv: boolean;
  hasNoindex: boolean;
  hasCanonical: boolean;
  canonicalHref: string | null;
  hasHeaderCall: boolean;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(p);
  }
  return out;
}

function loadRoutes(): Route[] {
  const routes: Route[] = [];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file);
    const slug = rel.replace(/\.tsx?$/, "").replace(/\/index$/, "").replace(/\.index$/, "");
    if (SKIP_PREFIXES.some((p) => slug.startsWith(p))) continue;
    const src = readFileSync(file, "utf8");
    if (!/createFileRoute\(/.test(src)) continue;
    const top = slug.split(/[/.]/)[0];
    const canonicalMatch = src.match(/rel:\s*['"]canonical['"]\s*,\s*href:\s*['"]([^'"]+)['"]/i);
    // Fallback: `href: URL` referencing a top-level `const URL = "https://..."`.
    let canonicalHref = canonicalMatch ? canonicalMatch[1] : null;
    if (!canonicalHref && /rel:\s*['"]canonical['"]\s*,\s*href:\s*[A-Za-z_$][\w$]*/i.test(src)) {
      const varMatch = src.match(/rel:\s*['"]canonical['"]\s*,\s*href:\s*([A-Za-z_$][\w$]*)/i);
      if (varMatch) {
        const constRe = new RegExp(`const\\s+${varMatch[1]}\\s*=\\s*['"]([^'"]+)['"]`);
        const constMatch = src.match(constRe);
        if (constMatch) canonicalHref = constMatch[1];
      }
    }
    routes.push({
      file: rel,
      slug,
      src,
      priv: PRIVATE_ROUTES.has(top),
      hasNoindex: /['"]robots['"]\s*,\s*content:\s*['"][^'"]*noindex/i.test(src),
      hasCanonical: /rel:\s*['"]canonical['"]/i.test(src),
      canonicalHref,
      hasHeaderCall: /setNoIndexHeader\s*\(/.test(src),
    });
  }
  return routes;
}

const routes = loadRoutes();
const bySlugTop = new Map(routes.map((r) => [r.slug.split(/[/.]/)[0], r]));

describe("SEO — public routes", () => {
  const publicRoutes = routes.filter((r) => !r.priv);

  it.each(publicRoutes.map((r) => [r.file, r]))("%s declares an absolute self-canonical", (_f, r) => {
    expect(r.hasCanonical, `${r.file} missing <link rel=canonical>`).toBe(true);
    expect(r.canonicalHref, `${r.file} canonical href unreadable`).toBeTruthy();
    expect(r.canonicalHref!.startsWith("http"), `${r.file} canonical must be absolute: ${r.canonicalHref}`).toBe(true);
    expect(r.canonicalHref!.startsWith(BASE_URL), `${r.file} canonical must live on ${BASE_URL}`).toBe(true);
  });

  it.each(publicRoutes.map((r) => [r.file, r]))("%s does not declare noindex", (_f, r) => {
    expect(r.hasNoindex, `${r.file} should be indexable but declares noindex`).toBe(false);
  });
});

describe("SEO — private / auth routes", () => {
  const privateRoutes = routes.filter((r) => r.priv);

  it.each(privateRoutes.map((r) => [r.file, r]))("%s declares meta robots noindex", (_f, r) => {
    expect(r.hasNoindex, `${r.file} missing meta robots noindex`).toBe(true);
  });

  it.each(privateRoutes.map((r) => [r.file, r]))("%s reinforces via setNoIndexHeader()", (_f, r) => {
    expect(r.hasHeaderCall, `${r.file} missing setNoIndexHeader() in beforeLoad`).toBe(true);
  });
});

describe("SEO — required route coverage", () => {
  it.each(REQUIRED_PUBLIC)("public route %s exists and passes", (name) => {
    const r = bySlugTop.get(name);
    expect(r, `expected public route ${name} to exist`).toBeTruthy();
    expect(r!.priv).toBe(false);
    expect(r!.hasCanonical).toBe(true);
  });

  it.each(REQUIRED_PRIVATE)("private route %s exists and is hidden", (name) => {
    const r = bySlugTop.get(name);
    expect(r, `expected private route ${name} to exist`).toBeTruthy();
    expect(r!.priv).toBe(true);
    expect(r!.hasNoindex).toBe(true);
    expect(r!.hasHeaderCall).toBe(true);
  });
});

describe("SEO — root layout does not leak", () => {
  const root = readFileSync(join(ROOT, "__root.tsx"), "utf8");
  it("root route does not set a canonical (would apply to every page)", () => {
    expect(/rel:\s*['"]canonical['"]/i.test(root)).toBe(false);
  });
  it("root route does not set meta robots (would apply to every page)", () => {
    expect(/['"]robots['"]\s*,\s*content:/i.test(root)).toBe(false);
  });
});
