import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { classifyPath } from "./lib/private-paths";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Centralized noindex policy: any request path that isn't in the explicit
// public allowlist (see src/lib/private-paths.ts) gets X-Robots-Tag set to
// noindex, nofollow, noarchive, nosnippet. New authenticated pages inherit
// the correct headers automatically — no per-route wiring needed.
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet";
const noIndexMiddleware = createMiddleware().server(async ({ next, request }) => {
  let pathname = "";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* ignore */
  }
  const policy = classifyPath(pathname);
  if (policy !== "noindex") return next();

  // Cache-Control that prevents shared caches (CDNs, proxies) and browsers
  // from storing private/auth'd content — pairs with X-Robots-Tag noindex.
  const CACHE_VALUE = "private, no-store, no-cache, must-revalidate, max-age=0";

  // Try setResponseHeader first (works for SSR-rendered pages).
  try {
    setResponseHeader("X-Robots-Tag", NOINDEX_VALUE);
    setResponseHeader("Cache-Control", CACHE_VALUE);
    setResponseHeader("Pragma", "no-cache");
    setResponseHeader("Vary", "Cookie, Authorization");
  } catch {
    /* no request context */
  }

  const result = await next();

  // Fallback: mutate the returned Response headers for handlers that build
  // their own Response (MCP, custom 404s, JSON handlers).
  const maybe = result as unknown;
  const res =
    maybe instanceof Response
      ? maybe
      : maybe && typeof maybe === "object" && "response" in (maybe as Record<string, unknown>)
        ? ((maybe as { response?: unknown }).response as Response | undefined)
        : undefined;
  if (res instanceof Response) {
    try {
      res.headers.set("X-Robots-Tag", NOINDEX_VALUE);
      res.headers.set("Cache-Control", CACHE_VALUE);
      res.headers.set("Pragma", "no-cache");
      // Append to Vary rather than replace so handler-set values survive.
      const existingVary = res.headers.get("Vary");
      const vary = new Set(
        (existingVary ? existingVary.split(",") : []).map((v) => v.trim()).filter(Boolean),
      );
      vary.add("Cookie");
      vary.add("Authorization");
      res.headers.set("Vary", Array.from(vary).join(", "));
    } catch {
      /* immutable */
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [noIndexMiddleware, errorMiddleware],
}));
