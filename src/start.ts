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

  // Try setResponseHeader first (works for SSR-rendered pages).
  try {
    setResponseHeader("X-Robots-Tag", NOINDEX_VALUE);
  } catch {
    /* no request context */
  }

  const result = await next();
  console.log("[noindex-mw] result", pathname, typeof result, result && Object.keys(result as object));

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
    try { res.headers.set("X-Robots-Tag", NOINDEX_VALUE); } catch { /* immutable */ }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [noIndexMiddleware, errorMiddleware],
}));
