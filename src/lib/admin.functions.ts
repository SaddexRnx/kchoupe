import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_platform_stats");
    if (error) throw new Error(error.message);
    return data as Record<string, any>;
  });

export const getPlatformTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_timeseries");
    if (error) throw new Error(error.message);
    return data as Record<string, any>;
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_list_users");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; email: string; display_name: string | null; avatar_url: string | null;
      created_at: string; last_sign_in_at: string | null; is_admin: boolean; workspace_count: number;
    }>;
  });

export const listAllWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_list_workspaces");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; name: string; plan: string; trial_ends_at: string; currency: string; country: string | null;
      created_at: string; member_count: number; employee_count: number; order_count: number; revenue: number;
    }>;
  });

export const listAllEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ai_employees")
      .select("id,name,role,status,model,avatar_emoji,workspace_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id,order_no,amount,currency,status,workspace_id,customer_name,customer_email,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("inbox_conversations")
      .select("id,channel,status,external_user,ai_employee_name,last_message,unread_count,workspace_id,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("integrations")
      .select("id,integration_key,category_id,status,workspace_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; makeAdmin: boolean }) => i)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.makeAdmin) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
    } else {
      if (data.userId === context.userId) throw new Error("You cannot remove your own admin role");
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateWorkspacePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string; plan: string; extendDays?: number }) => i)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, any> = { plan: data.plan };
    if (data.extendDays && data.extendDays > 0) {
      patch.trial_ends_at = new Date(Date.now() + data.extendDays * 86400_000).toISOString();
    }
    const { error } = await (context.supabase.from("workspaces") as any).update(patch).eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string }) => i)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("workspaces").delete().eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => i)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { title: string; body?: string; kind?: string }) => i)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: ws, error: wsErr } = await context.supabase.from("workspaces").select("id");
    if (wsErr) throw new Error(wsErr.message);
    const rows = (ws ?? []).map((w: any) => ({
      workspace_id: w.id,
      title: data.title,
      body: data.body ?? null,
      kind: data.kind ?? "info",
    }));
    if (rows.length) {
      const { error } = await context.supabase.from("notifications").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: rows.length };
  });
