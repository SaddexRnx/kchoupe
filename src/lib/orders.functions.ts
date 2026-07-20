import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  customer_email: string | null;
  product_summary: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "refunded" | "cancelled";
  confirmed_by_ai: boolean;
  ai_employee_id: string | null;
  notes: string | null;
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
  mrr: number;
  week_revenue: number;
  orders_total: number;
  refund_rate: number;
  confirmed_by_ai_today: number;
  products_active: number;
  conversations_open: number;
};

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const ws = await workspaceId(context);
    const [{ data: orders }, { data: prods }, { data: convos }] = await Promise.all([
      context.supabase.from("orders").select("amount,status,confirmed_by_ai,created_at").eq("workspace_id", ws),
      context.supabase.from("products").select("id,status").eq("workspace_id", ws),
      context.supabase.from("inbox_conversations").select("id,status").eq("workspace_id", ws),
    ]);
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const paid = (orders ?? []).filter((o: any) => o.status === "paid");
    const refunded = (orders ?? []).filter((o: any) => o.status === "refunded");
    const mrr = paid.filter((o: any) => new Date(o.created_at) >= monthAgo).reduce((s: number, o: any) => s + Number(o.amount ?? 0), 0);
    const week_revenue = paid.filter((o: any) => new Date(o.created_at) >= weekAgo).reduce((s: number, o: any) => s + Number(o.amount ?? 0), 0);
    const total = (orders ?? []).length;
    return {
      mrr,
      week_revenue,
      orders_total: total,
      refund_rate: total ? (refunded.length / total) * 100 : 0,
      confirmed_by_ai_today: (orders ?? []).filter((o: any) => o.confirmed_by_ai && new Date(o.created_at) >= startOfDay).length,
      products_active: (prods ?? []).filter((p: any) => p.status === "active").length,
      conversations_open: (convos ?? []).filter((c: any) => c.status === "open").length,
    };
  });