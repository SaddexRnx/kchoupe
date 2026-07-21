import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List products in the signed-in user's KC workspace, optionally filtered by a search query on name, SKU, or category.",
  inputSchema: {
    query: z.string().trim().optional().describe("Optional search term matched against name, SKU, and category."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = sb(ctx);
    const { data: wsId, error: wsErr } = await s.rpc("ensure_default_workspace");
    if (wsErr) return { content: [{ type: "text", text: wsErr.message }], isError: true };
    let q = s.from("products")
      .select("id,sku,name,category,price,currency,stock,status,sold_30,description")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (query) {
      const like = `%${query.replace(/[%_]/g, "")}%`;
      q = q.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
