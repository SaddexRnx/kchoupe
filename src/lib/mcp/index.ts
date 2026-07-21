import { auth, defineMcp } from "@lovable.dev/mcp-js";
import workspaceOverview from "./tools/workspace-overview";
import listProducts from "./tools/list-products";
import listOrders from "./tools/list-orders";
import createOrder from "./tools/create-order";
import listConversations from "./tools/list-conversations";

// Direct Supabase host (never the .lovable.cloud proxy) — issuer must match
// what the discovery document publishes, per RFC 8414.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kc-mcp",
  title: "KC",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in KC user. Use `workspace_overview` for a snapshot, `list_products` / `list_orders` / `list_conversations` to browse workspace data, and `create_order` to add a new order. All tools act as the connected user and respect that user's row-level access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [workspaceOverview, listProducts, listOrders, createOrder, listConversations],
});
