import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  status: "active" | "draft" | "out";
  image_emoji: string;
  sold_30: number;
  ai_sold: number;
  description: string | null;
  created_at: string;
};

async function workspaceId(ctx: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductRow[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase
      .from("products")
      .select("id,sku,name,category,price,currency,stock,status,image_emoji,sold_30,ai_sold,description,created_at")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductRow[];
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    name: string; category: string; price: number; stock: number; currency?: string; image_emoji?: string; sku?: string; description?: string;
  }) => {
    if (!input?.name?.trim()) throw new Error("Name required");
    if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProductRow> => {
    const ws = await workspaceId(context);
    const sku = data.sku?.trim() || "AT-" + Math.floor(1000 + Math.random() * 9000);
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        workspace_id: ws,
        sku,
        name: data.name.trim(),
        category: data.category || "Other",
        price: data.price,
        currency: data.currency || "DZD",
        stock: data.stock ?? 0,
        status: (data.stock ?? 0) > 0 ? "active" : "draft",
        image_emoji: data.image_emoji || "📦",
        description: data.description ?? null,
      })
      .select("id,sku,name,category,price,currency,stock,status,image_emoji,sold_30,ai_sold,description,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as ProductRow;
  });

export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    items: { sku?: string; name: string; category?: string; price: number; stock?: number; currency?: string; image_emoji?: string; description?: string }[];
  }) => {
    if (!Array.isArray(input?.items) || !input.items.length) throw new Error("No rows to import");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ inserted: number; skipped: number }> => {
    const ws = await workspaceId(context);
    const rows = data.items
      .filter((r) => r.name?.trim() && Number.isFinite(r.price) && r.price >= 0)
      .map((r) => ({
        workspace_id: ws,
        sku: r.sku?.trim() || "AT-" + Math.floor(1000 + Math.random() * 9000),
        name: r.name.trim(),
        category: r.category?.trim() || "Other",
        price: r.price,
        currency: r.currency?.trim() || "DZD",
        stock: r.stock ?? 0,
        status: ((r.stock ?? 0) > 0 ? "active" : "draft") as "active" | "draft",
        image_emoji: r.image_emoji || "📦",
        description: r.description ?? null,
      }));
    if (!rows.length) return { inserted: 0, skipped: data.items.length };
    const { data: inserted, error } = await context.supabase
      .from("products")
      .upsert(rows, { onConflict: "workspace_id,sku" })
      .select("id");
    if (error) throw new Error(error.message);
    return { inserted: inserted?.length ?? 0, skipped: data.items.length - (inserted?.length ?? 0) };
  });


export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<ProductRow> & { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProductRow> => {
    const { id, created_at, ...patch } = data as any;
    const { data: row, error } = await context.supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select("id,sku,name,category,price,currency,stock,status,image_emoji,sold_30,ai_sold,description,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as ProductRow;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProductRow> => {
    const ws = await workspaceId(context);
    const { data: src, error: srcErr } = await context.supabase
      .from("products").select("*").eq("id", data.id).single();
    if (srcErr) throw new Error(srcErr.message);
    const sku = "AT-" + Math.floor(1000 + Math.random() * 9000);
    const { data: row, error } = await context.supabase.from("products").insert({
      workspace_id: ws,
      sku,
      name: src.name + " (copy)",
      category: src.category,
      price: src.price,
      currency: src.currency,
      stock: src.stock,
      status: "draft",
      image_emoji: src.image_emoji,
    })
    .select("id,sku,name,category,price,currency,stock,status,image_emoji,sold_30,ai_sold,description,created_at")
    .single();
    if (error) throw new Error(error.message);
    return row as ProductRow;
  });