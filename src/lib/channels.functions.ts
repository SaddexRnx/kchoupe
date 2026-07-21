import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChannelRow = {
  channel: string;
  conversations: number;
  unread: number;
  escalations: number;
  messages: number;
  orders: number;
  revenue: number;
};

export const channelSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: wm } = await context.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", context.userId)
      .limit(1);
    const wsId = wm?.[0]?.workspace_id as string | undefined;
    if (!wsId) return { channels: [] as ChannelRow[], escalations: 0 };
    const { data, error } = await context.supabase.rpc("channel_summary", { _workspace_id: wsId });
    if (error) throw new Error(error.message);
    return data as { channels: ChannelRow[]; escalations: number };
  });
