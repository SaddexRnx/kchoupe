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
  name: "list_conversations",
  title: "List conversations",
  description: "List recent customer conversations in the signed-in user's Atlas AI workspace.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 25)."),
    channel: z.string().trim().optional().describe("Optional channel filter (telegram, meta, playground, etc.)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, channel }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = sb(ctx);
    const { data: wsId, error: wsErr } = await s.rpc("ensure_default_workspace");
    if (wsErr) return { content: [{ type: "text", text: wsErr.message }], isError: true };
    let q = s.from("conversations")
      .select("id,customer_name,channel,status,last_message_at,created_at")
      .eq("workspace_id", wsId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit ?? 25);
    if (channel) q = q.eq("channel", channel);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { conversations: data ?? [] },
    };
  },
});
