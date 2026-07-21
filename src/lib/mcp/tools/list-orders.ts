import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const STATUS = ["pending", "paid", "delivered", "cancelled", "returned", "refunded"] as const;

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description: "List orders in the signed-in user's KC workspace, optionally filtered by status.",
  inputSchema: {
    status: z.enum(STATUS).optional().describe("Filter by order status."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = sb(ctx);
    const { data: wsId, error: wsErr } = await s.rpc("ensure_default_workspace");
    if (wsErr) return { content: [{ type: "text", text: wsErr.message }], isError: true };
    let q = s.from("orders")
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,notes,created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
