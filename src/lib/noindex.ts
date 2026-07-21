import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Server-side X-Robots-Tag header for authenticated/private routes.
 * No-op on the client; sets the header during SSR.
 */
export const setNoIndexHeader = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("@tanstack/react-start/server") as {
        setResponseHeader: (name: string, value: string) => void;
      };
      mod.setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    } catch {
      // Outside a request context (build-time prerender) — meta tag covers it.
    }
  });
