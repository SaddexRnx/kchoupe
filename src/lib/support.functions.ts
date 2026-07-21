import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

async function firstWorkspaceId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1);
  return (data?.[0]?.workspace_id as string) ?? null;
}

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id,subject,status,priority,unread_for_user,unread_for_admin,last_message_at,created_at,updated_at,opened_by,workspace_id")
      .eq("opened_by", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id,subject,status,priority,unread_for_user,unread_for_admin,last_message_at,created_at,updated_at,opened_by,workspace_id")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { subject: string; body: string; priority?: string }) => i)
  .handler(async ({ data, context }) => {
    const wsId = await firstWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("Create a workspace first");
    const { data: t, error } = await context.supabase
      .from("support_tickets")
      .insert({
        workspace_id: wsId,
        opened_by: context.userId,
        subject: data.subject.slice(0, 160),
        priority: data.priority ?? "normal",
        status: "open",
        unread_for_admin: true,
        last_message_at: new Date().toISOString(),
      })
      .select("id,workspace_id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("support_messages").insert({
      ticket_id: t!.id,
      workspace_id: t!.workspace_id,
      sender_id: context.userId,
      sender_role: "user",
      body: data.body.slice(0, 4000),
    });
    if (mErr) throw new Error(mErr.message);
    return { id: t!.id };
  });

export const listTicketMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("support_messages")
      .select("id,ticket_id,sender_id,sender_role,body,created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const admin = await isAdmin(context.supabase, context.userId);
    // clear unread flag for whichever party is reading
    await context.supabase
      .from("support_tickets")
      .update(admin ? { unread_for_admin: false } : { unread_for_user: false })
      .eq("id", data.ticketId);
    return msgs ?? [];
  });

export const sendTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string; body: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: ticket, error: tErr } = await context.supabase
      .from("support_tickets")
      .select("id,workspace_id,opened_by")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!ticket) throw new Error("Ticket not found");
    const admin = await isAdmin(context.supabase, context.userId);
    if (!admin && ticket.opened_by !== context.userId) throw new Error("Forbidden");
    const { error } = await context.supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      workspace_id: ticket.workspace_id,
      sender_id: context.userId,
      sender_role: admin ? "admin" : "user",
      body: data.body.slice(0, 4000),
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("support_tickets")
      .update({
        last_message_at: new Date().toISOString(),
        unread_for_user: admin ? true : false,
        unread_for_admin: admin ? false : true,
      })
      .eq("id", ticket.id);
    return { ok: true };
  });

export const closeTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticketId: string; status: "open" | "closed" }) => i)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
