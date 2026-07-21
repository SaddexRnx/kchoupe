/**
 * Server-side X-Robots-Tag header for authenticated/private routes.
 *
 * Used from a route's `beforeLoad` to reinforce the in-page
 * `<meta name="robots" content="noindex, nofollow">` — search engines
 * honor the HTTP header even if the HTML never renders (redirects,
 * errors, 401s) or if the meta tag is stripped by a proxy.
 *
 * Safe to call from any route: the helper is a no-op in the browser and
 * only touches response headers during SSR.
 */
export async function setNoIndexHeader(): Promise<void> {
  if (typeof window !== "undefined") return;
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  } catch {
    // Outside a server request context (e.g. build-time prerender without
    // an active request) — the meta tag still covers this case.
  }
}
