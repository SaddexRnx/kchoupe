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
const noIndexMiddleware = createMiddleware().server(async ({ next, request }) => {
  let pathname = "";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* ignore */
  }
  const policy = classifyPath(pathname);
  if (policy === "noindex") {
    try {
      setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    } catch {
      /* no request context */
    }
  }
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [noIndexMiddleware, errorMiddleware],
}));
