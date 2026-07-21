// Load the module augmentation that adds `server` to createFileRoute.
// Without this, generated route files that omit `import type {} from "@tanstack/react-start"`
// (mcp-js's plugin output and other server-only routes) fail typecheck.
import type {} from "@tanstack/start-client-core/serverRoute";
