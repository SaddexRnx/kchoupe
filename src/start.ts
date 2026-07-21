import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
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

// Block search engines from indexing API surfaces, MCP endpoints,
// well-known metadata, and internal RPC. Applies to every server response
// under these paths regardless of the handler's own headers.
const NOINDEX_PREFIXES = ["/api/", "/mcp", "/.well-known/", "/_serverFn/"];
const noIndexApiMiddleware = createMiddleware().server(async ({ next, request }) => {
  let path = "";
  try {
    path = new URL(request.url).pathname;
  } catch {
    /* ignore */
  }
  const match = NOINDEX_PREFIXES.some(
    (p) => path === p.replace(/\/$/, "") || path.startsWith(p),
  );
  if (match) {
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
  requestMiddleware: [noIndexApiMiddleware, errorMiddleware],
}));
