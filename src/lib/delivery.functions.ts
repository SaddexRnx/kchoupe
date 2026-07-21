import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

export type Carrier = {
  id: string; workspace_id: string; name: string; mode: "manual" | "api";
  provider: string | null; tracking_url_template: string | null;
  default_fee: number; is_default: boolean; active: boolean; notes: string | null;
};

export type ShippingZone = {
  id: string; workspace_id: string; wilaya_code: number;
  home_fee: number; desk_fee: number | null; free_shipping_threshold: number | null;
  estimated_days: number | null; active: boolean;
};

export type Wilaya = { code: number; name_fr: string; name_ar: string; name_en: string };

export const listWilayas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Wilaya[]> => {
    const { data, error } = await context.supabase.from("wilayas").select("code,name_fr,name_ar,name_en").order("code");
    if (error) throw new Error(error.message);
    return (data ?? []) as Wilaya[];
  });

export const listCarriers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Carrier[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase.from("carriers").select("*").eq("workspace_id", ws).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as Carrier[];
  });

export const upsertCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<Carrier> & { id?: string; name: string }) => {
    if (!input.name?.trim()) throw new Error("Name required");
    return input;
  })
  .handler(async ({ data, context }): Promise<Carrier> => {
    const ws = await workspaceId(context);
    const payload = {
      workspace_id: ws,
      name: data.name.trim(),
      mode: data.mode ?? "manual",
      provider: data.provider ?? null,
      tracking_url_template: data.tracking_url_template ?? null,
      default_fee: data.default_fee ?? 0,
      is_default: data.is_default ?? false,
      active: data.active ?? true,
      notes: data.notes ?? null,
    };
    const q = data.id
      ? context.supabase.from("carriers").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("carriers").insert(payload).select("*").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row as Carrier;
  });

export const deleteCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { if (!input.id) throw new Error("id required"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("carriers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listShippingZones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShippingZone[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase.from("shipping_zones").select("*").eq("workspace_id", ws).order("wilaya_code");
    if (error) throw new Error(error.message);
    return (data ?? []) as ShippingZone[];
  });

export const upsertShippingZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string; wilaya_code: number; home_fee: number;
    desk_fee?: number | null; free_shipping_threshold?: number | null;
    estimated_days?: number | null; active?: boolean;
  }) => {
    if (!input.wilaya_code) throw new Error("wilaya required");
    if (!Number.isFinite(input.home_fee)) throw new Error("home_fee required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ShippingZone> => {
    const ws = await workspaceId(context);
    const payload = {
      workspace_id: ws,
      wilaya_code: data.wilaya_code,
      home_fee: data.home_fee,
      desk_fee: data.desk_fee ?? null,
      free_shipping_threshold: data.free_shipping_threshold ?? null,
      estimated_days: data.estimated_days ?? null,
      active: data.active ?? true,
    };
    const { data: row, error } = await context.supabase
      .from("shipping_zones")
      .upsert(payload, { onConflict: "workspace_id,wilaya_code" })
      .select("*").single();
    if (error) throw new Error(error.message);
    return row as ShippingZone;
  });

export const deleteShippingZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { if (!input.id) throw new Error("id required"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shipping_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetShippingZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fee: number; free_shipping_threshold?: number | null; wilayas?: number[] }) => {
    if (!Number.isFinite(input.fee)) throw new Error("fee required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const codes = data.wilayas?.length
      ? data.wilayas
      : ((await context.supabase.from("wilayas").select("code")).data ?? []).map((w: { code: number }) => w.code);
    const rows = codes.map((c: number) => ({
      workspace_id: ws, wilaya_code: c, home_fee: data.fee,
      free_shipping_threshold: data.free_shipping_threshold ?? null, active: true,
    }));
    const { error } = await context.supabase.from("shipping_zones").upsert(rows, { onConflict: "workspace_id,wilaya_code" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const quoteShippingFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { wilaya_code: number; order_value: number; delivery_type?: "home" | "desk" }) => input)
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const { data: res, error } = await context.supabase.rpc("calculate_shipping_fee", {
      _workspace_id: ws, _wilaya_code: data.wilaya_code,
      _order_value: data.order_value, _delivery_type: data.delivery_type ?? "home",
    });
    if (error) throw new Error(error.message);
    return res as { found: boolean; fee: number; free_shipping_applied: boolean; threshold: number | null; estimated_days: number | null };
  });

export const assignShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order_id: string; carrier_id?: string | null; tracking_number?: string | null; shipping_status?: string }) => {
    if (!input.order_id) throw new Error("order_id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("assign_shipment", {
      _order_id: data.order_id, _carrier_id: (data.carrier_id ?? null) as any,
      _tracking: (data.tracking_number ?? null) as any, _status: (data.shipping_status ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const listDeliveryHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("delivery_status_history").select("id,status,note,created_at,created_by")
      .eq("order_id", data.order_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateOrderDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string; wilaya_code?: number | null; commune?: string | null; address?: string | null;
    customer_phone?: string | null; delivery_type?: "home" | "desk" | "pickup"; delivery_fee?: number; cod_amount?: number | null;
  }) => { if (!input.id) throw new Error("id required"); return input; })
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const k of ["wilaya_code","commune","address","customer_phone","delivery_type","delivery_fee","cod_amount"] as const) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    const { data: row, error } = await context.supabase.from("orders").update(patch as any).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });
