import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InboxConvo = {
  id: string;
  channel: string;
  external_user: string;
  ai_employee_id: string | null;
  ai_employee_name: string | null;
  last_message: string | null;
  status: "open" | "won" | "risk" | "resolved";
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type InboxMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "agent" | "system";
  sender: string | null;
  body: string;
  created_at: string;
};

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InboxConvo[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase
      .from("inbox_conversations")
      .select("id,channel,external_user,ai_employee_id,ai_employee_name,last_message,status,unread_count,created_at,updated_at")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as InboxConvo[];
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversation_id: string }) => {
    if (!input?.conversation_id) throw new Error("conversation_id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<InboxMessage[]> => {
    const { data: rows, error } = await context.supabase
      .from("inbox_messages")
      .select("id,conversation_id,role,sender,body,created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as InboxMessage[];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    external_user: string; channel?: string; first_message?: string;
    ai_employee_id?: string | null; ai_employee_name?: string | null;
  }) => {
    if (!input?.external_user?.trim()) throw new Error("external_user required");
    return input;
  })
  .handler(async ({ data, context }): Promise<InboxConvo> => {
    const ws = await workspaceId(context);
    const { data: convo, error } = await context.supabase.from("inbox_conversations").insert({
      workspace_id: ws,
      channel: data.channel || "web",
      external_user: data.external_user.trim(),
      ai_employee_id: data.ai_employee_id || null,
      ai_employee_name: data.ai_employee_name || null,
      last_message: data.first_message || null,
      unread_count: data.first_message ? 1 : 0,
    })
    .select("id,channel,external_user,ai_employee_id,ai_employee_name,last_message,status,unread_count,created_at,updated_at")
    .single();
    if (error) throw new Error(error.message);
    if (data.first_message) {
      await context.supabase.from("inbox_messages").insert({
        workspace_id: ws, conversation_id: convo.id, role: "user", sender: data.external_user, body: data.first_message,
      });
    }
    return convo as InboxConvo;
  });

export const sendReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversation_id: string; body: string; sender?: string }) => {
    if (!input?.conversation_id) throw new Error("conversation_id required");
    if (!input?.body?.trim()) throw new Error("body required");
    return input;
  })
  .handler(async ({ data, context }): Promise<InboxMessage> => {
    const ws = await workspaceId(context);
    const { data: msg, error } = await context.supabase.from("inbox_messages").insert({
      workspace_id: ws,
      conversation_id: data.conversation_id,
      role: "agent",
      sender: data.sender ?? "You",
      body: data.body.trim(),
    })
    .select("id,conversation_id,role,sender,body,created_at")
    .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("inbox_conversations")
      .update({ last_message: data.body.trim(), unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", data.conversation_id);
    return msg as InboxMessage;
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: InboxConvo["status"] }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<InboxConvo> => {
    const { data: row, error } = await context.supabase.from("inbox_conversations")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("id,channel,external_user,ai_employee_id,ai_employee_name,last_message,status,unread_count,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as InboxConvo;
  });

