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
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,seen,created_at")
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
    .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,seen,created_at")
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
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,seen,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as OrderRow;
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status?: OrderStatus; notes?: string | null; seen?: boolean }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<OrderRow> => {
    const patch: { status?: OrderStatus; notes?: string | null; seen?: boolean } = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.seen !== undefined) patch.seen = data.seen;
    const { data: row, error } = await context.supabase.from("orders")
      .update(patch)
      .eq("id", data.id)
      .select("id,order_no,customer_name,customer_email,product_summary,amount,currency,status,confirmed_by_ai,ai_employee_id,notes,seen,created_at")
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
  periodDays: number;
  periodRevenue: number;
  periodOrders: number;
  periodConversations: number;
  series: Array<{ date: string; revenue: number; orders: number; conversations: number }>;
  confirmedToday: Array<{
    id: string; order_no: string; customer_name: string; product_summary: string;
    amount: number; currency: string; status: string; ai_employee_id: string | null; created_at: string;
  }>;
  aiAgents: Array<{ id: string; name: string; role: string | null; model: string | null; status: string; chats: number }>;
  recentMessages: Array<{ id: string; external_user: string; last_message: string | null; ai_employee_name: string | null; updated_at: string }>;
};

export const dashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { periodDays?: number }) => ({ periodDays: input?.periodDays ?? 30 }))
  .handler(async ({ data, context }): Promise<DashboardStats> => {
    const ws = await workspaceId(context);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const days = [1, 7, 30, 90].includes(data.periodDays) ? data.periodDays : 30;
    const periodStart = new Date(Date.now() - days * 86400000);

    const [employeesRes, productsRes, ordersRes, convosRes, confirmedRes, recentRes, msgsRes] = await Promise.all([
      context.supabase.from("ai_employees").select("id,name,role,model,status").eq("workspace_id", ws),
      context.supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      context.supabase.from("orders").select("amount,currency,status,confirmed_by_ai,created_at,ai_employee_id").eq("workspace_id", ws),
      context.supabase.from("inbox_conversations").select("id,external_user,last_message,ai_employee_name,ai_employee_id,updated_at,created_at,status").eq("workspace_id", ws).order("updated_at", { ascending: false }),
      context.supabase.from("orders")
        .select("id,order_no,customer_name,product_summary,amount,currency,status,ai_employee_id,created_at")
        .eq("workspace_id", ws).eq("confirmed_by_ai", true)
        .gte("created_at", dayStart.toISOString())
        .order("created_at", { ascending: false }).limit(6),
      context.supabase.from("inbox_conversations")
        .select("id,external_user,last_message,ai_employee_name,updated_at")
        .eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(4),
      context.supabase.from("inbox_messages").select("created_at,conversation_id").eq("workspace_id", ws).gte("created_at", periodStart.toISOString()),
    ]);

    const orderRows = (ordersRes.data ?? []) as Array<{ amount: number; created_at: string; status: string; ai_employee_id: string | null }>;
    const now = Date.now();
    const w7 = now - 7 * 86400000;
    const w30 = now - 30 * 86400000;
    const paidIn = (rows: typeof orderRows, since: number) => rows.filter((o) => (o.status === "paid" || o.status === "delivered") && new Date(o.created_at).getTime() >= since);
    const volume7d = paidIn(orderRows, w7).reduce((s, o) => s + Number(o.amount), 0);
    const volume30d = paidIn(orderRows, w30).reduce((s, o) => s + Number(o.amount), 0);

    const convoRows = (convosRes.data ?? []) as Array<{ id: string; ai_employee_id: string | null; created_at: string }>;
    const chatCount = new Map<string, number>();
    convoRows.forEach((c) => { if (c.ai_employee_id) chatCount.set(c.ai_employee_id, (chatCount.get(c.ai_employee_id) ?? 0) + 1); });

    const aiAgents = ((employeesRes.data ?? []) as Array<{ id: string; name: string; role: string | null; model: string | null; status: string }>)
      .slice(0, 4).map((e) => ({ ...e, chats: chatCount.get(e.id) ?? 0 }));

    // Build daily buckets over the selected period
    const buckets = new Map<string, { revenue: number; orders: number; conversations: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { revenue: 0, orders: 0, conversations: 0 });
    }
    const periodStartMs = periodStart.getTime();
    for (const o of orderRows) {
      const t = new Date(o.created_at).getTime();
      if (t < periodStartMs) continue;
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const b = buckets.get(key); if (!b) continue;
      b.orders += 1;
      if (o.status === "paid" || o.status === "delivered") b.revenue += Number(o.amount);
    }
    const msgRows = (msgsRes.data ?? []) as Array<{ created_at: string; conversation_id: string }>;
    const seenConvo = new Map<string, Set<string>>();
    for (const m of msgRows) {
      const key = new Date(m.created_at).toISOString().slice(0, 10);
      if (!buckets.has(key)) continue;
      let s = seenConvo.get(key); if (!s) { s = new Set(); seenConvo.set(key, s); }
      if (s.has(m.conversation_id)) continue;
      s.add(m.conversation_id);
      buckets.get(key)!.conversations += 1;
    }
    const series = Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
    const periodRevenue = series.reduce((s, x) => s + x.revenue, 0);
    const periodOrders = series.reduce((s, x) => s + x.orders, 0);
    const periodConversations = series.reduce((s, x) => s + x.conversations, 0);

    return {
      aiEmployees: (employeesRes.data ?? []).length,
      products: productsRes.count ?? 0,
      orders: orderRows.length,
      conversations: convoRows.length,
      volume7d, volume30d,
      periodDays: days, periodRevenue, periodOrders, periodConversations, series,
      confirmedToday: (confirmedRes.data ?? []) as DashboardStats["confirmedToday"],
      aiAgents,
      recentMessages: (recentRes.data ?? []) as DashboardStats["recentMessages"],
    };
  });

export type DashboardExtras = {
  statusCounts: Record<string, number>;
  avgOrderValue: number;
  aiResolutionRate: number;
  totalMessages: number;
  totalRevenue: number;
  topProducts: Array<{ id: string; name: string; sold_30: number; price: number; currency: string; image_emoji: string | null; stock: number }>;
  lowStock: Array<{ id: string; name: string; stock: number; sku: string | null }>;
  integrations: Array<{ provider: string; status: string; last_test_status: string | null; last_test_at: string | null }>;
  learningsCount: number;
  openTickets: number;
  activity: Array<{ id: string; kind: string; label: string; sub: string; created_at: string }>;
};

export const dashboardExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardExtras> => {
    const ws = await workspaceId(context);
    const [ordersRes, productsRes, integRes, learnRes, ticketsRes, msgCountRes, recentOrdersRes] = await Promise.all([
      context.supabase.from("orders").select("status,amount,confirmed_by_ai,created_at").eq("workspace_id", ws),
      context.supabase.from("products").select("id,name,sold_30,price,currency,image_emoji,stock,sku").eq("workspace_id", ws),
      context.supabase.from("integrations").select("provider,status,connected_at").eq("workspace_id", ws),
      context.supabase.from("workspace_learnings").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      context.supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("workspace_id", ws).in("status", ["open", "pending"]),
      context.supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
      context.supabase.from("orders").select("id,order_no,customer_name,status,created_at,confirmed_by_ai,amount,currency").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(6),
    ]);

    const orders = (ordersRes.data ?? []) as Array<{ status: string; amount: number; confirmed_by_ai: boolean }>;
    const statusCounts: Record<string, number> = {};
    let paidTotal = 0, paidCount = 0, aiConfirmed = 0;
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      if (o.status === "paid" || o.status === "delivered") { paidTotal += Number(o.amount); paidCount += 1; }
      if (o.confirmed_by_ai) aiConfirmed += 1;
    }
    const products = (productsRes.data ?? []) as Array<{ id: string; name: string; sold_30: number | null; price: number; currency: string; image_emoji: string | null; stock: number; sku: string | null }>;
    const topProducts = [...products].sort((a, b) => (b.sold_30 ?? 0) - (a.sold_30 ?? 0)).slice(0, 5).map((p) => ({ id: p.id, name: p.name, sold_30: p.sold_30 ?? 0, price: p.price, currency: p.currency, image_emoji: p.image_emoji, stock: p.stock }));
    const lowStock = products.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5).map((p) => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku }));
    const integrations = ((integRes.data ?? []) as Array<{ provider: string; status: string; connected_at: string | null }>);

    const recentOrders = (recentOrdersRes.data ?? []) as Array<{ id: string; order_no: string; customer_name: string; status: string; created_at: string; confirmed_by_ai: boolean; amount: number; currency: string }>;
    const activity = recentOrders.map((o) => ({
      id: o.id,
      kind: o.confirmed_by_ai ? "ai_order" : "order",
      label: `${o.order_no} · ${o.customer_name}`,
      sub: `${o.status} · ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency, maximumFractionDigits: 0 }).format(Number(o.amount))}`,
      created_at: o.created_at,
    }));

    return {
      statusCounts,
      avgOrderValue: paidCount ? paidTotal / paidCount : 0,
      aiResolutionRate: orders.length ? aiConfirmed / orders.length : 0,
      totalMessages: msgCountRes.count ?? 0,
      totalRevenue: paidTotal,
      topProducts,
      lowStock,
      integrations,
      learningsCount: learnRes.count ?? 0,
      openTickets: ticketsRes.count ?? 0,
      activity,
    };
  });


