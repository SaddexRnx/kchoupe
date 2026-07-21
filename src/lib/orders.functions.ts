import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled" | "returned" | "refunded";
export type OrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  customer_email: string | null;
  product_summary: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  confirmed_by_ai: boolean;
  ai_employee_id: string | null;
  notes: string | null;
  seen: boolean;
  created_at: string;
};


async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderRow[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,created_at")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderRow[];
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    customer_name: string; customer_email?: string; product_summary: string;
    amount: number; currency?: string; status?: OrderRow["status"];
    confirmed_by_ai?: boolean; ai_employee_id?: string | null; notes?: string;
  }) => {
    if (!input?.customer_name?.trim()) throw new Error("Customer required");
    if (!input?.product_summary?.trim()) throw new Error("Product required");
    if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error("Amount required");
    return input;
  })
  .handler(async ({ data, context }): Promise<OrderRow> => {
    const ws = await workspaceId(context);
    const order_no = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const { data: row, error } = await context.supabase.from("orders").insert({
      workspace_id: ws,
      order_no,
      customer_name: data.customer_name.trim(),
      customer_email: data.customer_email?.trim() || null,
      product_summary: data.product_summary.trim(),
      amount: data.amount,
      currency: data.currency || "DZD",
      status: data.status || "pending",
      confirmed_by_ai: !!data.confirmed_by_ai,
      ai_employee_id: data.ai_employee_id || null,
      notes: data.notes || null,
    })
    .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,created_at")
    .single();
    if (error) throw new Error(error.message);
    return row as OrderRow;
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: OrderRow["status"] }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<OrderRow> => {
    const { data: row, error } = await context.supabase.from("orders")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as OrderRow;
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type DashboardStats = {
  aiEmployees: number;
  products: number;
  orders: number;
  conversations: number;
  volume7d: number;
  volume30d: number;
  confirmedToday: Array<{
    id: string; order_no: string; customer_name: string; product_summary: string;
    amount: number; currency: string; status: string; ai_employee_id: string | null; created_at: string;
  }>;
  aiAgents: Array<{ id: string; name: string; role: string | null; model: string | null; status: string; chats: number }>;
  recentMessages: Array<{ id: string; external_user: string; last_message: string | null; ai_employee_name: string | null; updated_at: string }>;
};

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const ws = await workspaceId(context);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

    const [employeesRes, productsRes, ordersRes, convosRes, confirmedRes, recentRes] = await Promise.all([
      context.supabase.from("ai_employees").select("id,name,role,model,status").eq("workspace_id", ws),
      context.supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      context.supabase.from("orders").select("amount,currency,status,confirmed_by_ai,created_at,ai_employee_id").eq("workspace_id", ws),
      context.supabase.from("inbox_conversations").select("id,external_user,last_message,ai_employee_name,ai_employee_id,updated_at,status").eq("workspace_id", ws).order("updated_at", { ascending: false }),
      context.supabase.from("orders")
        .select("id,order_no,customer_name,product_summary,amount,currency,status,ai_employee_id,created_at")
        .eq("workspace_id", ws).eq("confirmed_by_ai", true)
        .gte("created_at", dayStart.toISOString())
        .order("created_at", { ascending: false }).limit(6),
      context.supabase.from("inbox_conversations")
        .select("id,external_user,last_message,ai_employee_name,updated_at")
        .eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(4),
    ]);

    const orderRows = (ordersRes.data ?? []) as Array<{ amount: number; created_at: string; status: string; ai_employee_id: string | null }>;
    const now = Date.now();
    const w7 = now - 7 * 86400000;
    const w30 = now - 30 * 86400000;
    const volume7d = orderRows.filter((o) => o.status === "paid" && new Date(o.created_at).getTime() >= w7).reduce((s, o) => s + Number(o.amount), 0);
    const volume30d = orderRows.filter((o) => o.status === "paid" && new Date(o.created_at).getTime() >= w30).reduce((s, o) => s + Number(o.amount), 0);

    const convoRows = (convosRes.data ?? []) as Array<{ ai_employee_id: string | null }>;
    const chatCount = new Map<string, number>();
    convoRows.forEach((c) => { if (c.ai_employee_id) chatCount.set(c.ai_employee_id, (chatCount.get(c.ai_employee_id) ?? 0) + 1); });

    const aiAgents = ((employeesRes.data ?? []) as Array<{ id: string; name: string; role: string | null; model: string | null; status: string }>)
      .slice(0, 4).map((e) => ({ ...e, chats: chatCount.get(e.id) ?? 0 }));

    return {
      aiEmployees: (employeesRes.data ?? []).length,
      products: productsRes.count ?? 0,
      orders: orderRows.length,
      conversations: convoRows.length,
      volume7d, volume30d,
      confirmedToday: (confirmedRes.data ?? []) as DashboardStats["confirmedToday"],
      aiAgents,
      recentMessages: (recentRes.data ?? []) as DashboardStats["recentMessages"],
    };
  });

