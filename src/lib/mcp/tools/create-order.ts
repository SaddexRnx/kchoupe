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
  name: "create_order",
  title: "Create order",
  description: "Create a new order in the signed-in user's KC workspace.",
  inputSchema: {
    customer_name: z.string().trim().min(1),
    product_summary: z.string().trim().min(1).describe("Short description of what the customer is buying."),
    amount: z.number().nonnegative(),
    currency: z.string().trim().optional().describe("ISO currency code (default DZD)."),
    customer_email: z.string().email().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = sb(ctx);
    const { data: wsId, error: wsErr } = await s.rpc("ensure_default_workspace");
    if (wsErr) return { content: [{ type: "text", text: wsErr.message }], isError: true };
    const order_no = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const { data, error } = await s.from("orders").insert({
      workspace_id: wsId,
      order_no,
      customer_name: input.customer_name,
      customer_email: input.customer_email ?? null,
      product_summary: input.product_summary,
      amount: input.amount,
      currency: input.currency ?? "DZD",
      status: "pending",
      notes: input.notes ?? null,
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created order ${order_no}` }],
      structuredContent: { order: data },
    };
  },
});
