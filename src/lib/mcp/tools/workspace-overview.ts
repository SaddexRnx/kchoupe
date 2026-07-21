import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "workspace_overview",
  title: "Workspace overview",
  description: "Return a summary of the signed-in user's Atlas AI workspace: workspace name, plan, and counts of products, orders, conversations, and AI employees.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = sb(ctx);
    const { data: wsId, error: wsErr } = await s.rpc("ensure_default_workspace");
    if (wsErr) return { content: [{ type: "text", text: wsErr.message }], isError: true };
    const [ws, products, orders, convos, employees] = await Promise.all([
      s.from("workspaces").select("id,name,plan,plan_started_at").eq("id", wsId).maybeSingle(),
      s.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
      s.from("orders").select("id,status,amount,currency", { count: "exact" }).eq("workspace_id", wsId),
      s.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
      s.from("ai_employees").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
    ]);
    const totalRevenue = (orders.data ?? [])
      .filter((o: any) => ["paid", "delivered"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.amount ?? 0), 0);
    const overview = {
      workspace: ws.data,
      counts: {
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        conversations: convos.count ?? 0,
        ai_employees: employees.count ?? 0,
      },
      revenue_paid_or_delivered: totalRevenue,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      structuredContent: overview,
    };
  },
});
