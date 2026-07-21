import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard.server";

export type CustomModelRow = {
  id: string;
  label: string;
  base_url: string;
  model_id: string;
  api_key_masked: string;
  last_test_status: string | null;
  last_test_message: string | null;
  last_test_at: string | null;
  created_at: string;
};

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

function mask(k: string) {
  if (!k) return "";
  if (k.length <= 8) return "•".repeat(k.length);
  return k.slice(0, 4) + "…" + k.slice(-4);
}

function toRow(r: any): CustomModelRow {
  return {
    id: r.id, label: r.label, base_url: r.base_url, model_id: r.model_id,
    api_key_masked: mask(r.api_key),
    last_test_status: r.last_test_status, last_test_message: r.last_test_message, last_test_at: r.last_test_at,
    created_at: r.created_at,
  };
}

export const listCustomModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomModelRow[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase
      .from("custom_models").select("*")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toRow);
  });

async function pingChatCompletions(baseUrl: string, apiKey: string, model: string) {
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const started = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
    });
    const text = await r.text();
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { const j = JSON.parse(text); msg = j?.error?.message || j?.message || msg; } catch {}
      return { ok: false, message: msg, latency: Date.now() - started };
    }
    return { ok: true, message: `Handshake ok (${Date.now() - started}ms)`, latency: Date.now() - started };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error", latency: Date.now() - started };
  }
}

export const saveCustomModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; label: string; base_url: string; model_id: string; api_key?: string }) => {
    if (!input.label?.trim() || !input.base_url?.trim() || !input.model_id?.trim()) throw new Error("All fields required");
    return input;
  })
  .handler(async ({ data, context }): Promise<CustomModelRow> => {
    const ws = await workspaceId(context);
    // Handshake before saving so status is real from the start.
    let ping: { ok: boolean; message: string } = { ok: true, message: "Not tested" };
    if (data.api_key) ping = await pingChatCompletions(data.base_url, data.api_key, data.model_id);

    if (data.id) {
      const patch: any = { label: data.label, base_url: data.base_url, model_id: data.model_id };
      if (data.api_key) patch.api_key = data.api_key;
      patch.last_test_status = ping.ok ? "ok" : "fail";
      patch.last_test_message = ping.message;
      patch.last_test_at = new Date().toISOString();
      const { data: row, error } = await context.supabase
        .from("custom_models").update(patch).eq("id", data.id).eq("workspace_id", ws)
        .select("*").single();
      if (error) throw new Error(error.message);
      return toRow(row);
    }
    if (!data.api_key) throw new Error("API key required");
    const { data: row, error } = await context.supabase
      .from("custom_models").insert({
        workspace_id: ws,
        created_by: context.userId,
        label: data.label, base_url: data.base_url, model_id: data.model_id, api_key: data.api_key,
        last_test_status: ping.ok ? "ok" : "fail",
        last_test_message: ping.message,
        last_test_at: new Date().toISOString(),
      }).select("*").single();
    if (error) throw new Error(error.message);
    return toRow(row);
  });

export const testCustomModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<CustomModelRow> => {
    const ws = await workspaceId(context);
    const { data: existing, error: eErr } = await context.supabase
      .from("custom_models").select("*").eq("id", data.id).eq("workspace_id", ws).single();
    if (eErr) throw new Error(eErr.message);
    const ping = await pingChatCompletions(existing.base_url, existing.api_key, existing.model_id);
    const { data: row, error } = await context.supabase
      .from("custom_models").update({
        last_test_status: ping.ok ? "ok" : "fail",
        last_test_message: ping.message,
        last_test_at: new Date().toISOString(),
      }).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    return toRow(row);
  });

export const deleteCustomModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const { error } = await context.supabase.from("custom_models").delete().eq("id", data.id).eq("workspace_id", ws);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
