import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

async function currentWorkspaceId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_default_workspace");
  if (error || !data) {
    const { data: m } = await supabase
      .from("workspace_members").select("workspace_id")
      .eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    return m?.workspace_id;
  }
  return data as string;
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wsId = await currentWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { items: [] as NotificationRow[], unread: 0 };
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    const items = (data ?? []) as NotificationRow[];
    return { items, unread: items.filter((n) => !n.read_at).length };
  });

const MarkInput = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MarkInput.parse(d))
  .handler(async ({ context, data }) => {
    const wsId = await currentWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { ok: true };
    let q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("workspace_id", wsId).is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });
