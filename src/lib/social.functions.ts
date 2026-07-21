import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Real connectivity tests against Telegram + Facebook Graph API.
// The tokens live inside the integrations row (JSONB credentials), workspace-scoped by RLS.

export type SocialProvider = "telegram" | "facebook_page";

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

async function pingTelegram(botToken: string): Promise<{ ok: boolean; message: string; meta?: any }> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/getMe`);
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return { ok: false, message: j?.description || `HTTP ${r.status}` };
    return { ok: true, message: `Connected as @${j.result?.username ?? "bot"}`, meta: j.result };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

async function pingFacebookPage(pageAccessToken: string): Promise<{ ok: boolean; message: string; meta?: any }> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${encodeURIComponent(pageAccessToken)}`);
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || j?.error) return { ok: false, message: j?.error?.message || `HTTP ${r.status}` };
    return { ok: true, message: `Connected to page "${j.name}"`, meta: j };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

async function ping(provider: SocialProvider, creds: any) {
  if (provider === "telegram") return pingTelegram(String(creds?.botToken || ""));
  if (provider === "facebook_page") return pingFacebookPage(String(creds?.pageAccessToken || ""));
  return { ok: false, message: "Unknown provider" };
}

export type SocialChannel = {
  id: string | null;
  provider: SocialProvider;
  connected: boolean;
  status: "connected" | "disconnected" | "reauth";
  handle: string | null; // display name / username after test
  last_test_status: string | null;
  last_test_message: string | null;
  last_test_at: string | null;
  assigned_employees: string[];
  has_credentials: boolean;
};

const KEY_OF: Record<SocialProvider, string> = {
  telegram: "Telegram Bot",
  facebook_page: "Facebook Page",
};

function rowToChannel(provider: SocialProvider, r: any | null): SocialChannel {
  if (!r) return {
    id: null, provider, connected: false, status: "disconnected", handle: null,
    last_test_status: null, last_test_message: null, last_test_at: null,
    assigned_employees: [], has_credentials: false,
  };
  const creds = r.credentials ?? {};
  const handle = creds.__handle || null;
  const hasCreds = provider === "telegram" ? !!creds.botToken : !!creds.pageAccessToken;
  return {
    id: r.id, provider,
    connected: r.status === "connected",
    status: r.status,
    handle,
    last_test_status: r.last_test_status,
    last_test_message: r.last_test_message,
    last_test_at: r.last_test_at,
    assigned_employees: r.assigned_employees ?? [],
    has_credentials: hasCreds,
  };
}

export const listSocialChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SocialChannel[]> => {
    const ws = await workspaceId(context);
    const providers: SocialProvider[] = ["telegram", "facebook_page"];
    const out: SocialChannel[] = [];
    for (const p of providers) {
      const { data } = await context.supabase
        .from("integrations")
        .select("id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at")
        .eq("workspace_id", ws).eq("integration_key", KEY_OF[p])
        .maybeSingle();
      out.push(rowToChannel(p, data));
    }
    return out;
  });

export const saveSocialChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: SocialProvider; credentials: Record<string, string>; assigned_employees?: string[] }) => {
    if (!input?.provider) throw new Error("provider required");
    return input;
  })
  .handler(async ({ data, context }): Promise<SocialChannel> => {
    const ws = await workspaceId(context);
    // Merge with existing creds so a blank field doesn't wipe the saved one.
    const { data: existing } = await context.supabase
      .from("integrations")
      .select("credentials,assigned_employees")
      .eq("workspace_id", ws).eq("integration_key", KEY_OF[data.provider])
      .maybeSingle();
    const merged: any = { ...((existing?.credentials as Record<string, any>) || {}) };
    for (const [k, v] of Object.entries(data.credentials || {})) {
      if (v == null || v === "" || v === "__saved__") continue;
      merged[k] = v;
    }
    // Live handshake
    const started = Date.now();
    const result = await ping(data.provider, merged);
    const latency = Date.now() - started;
    if (result.ok) {
      merged.__handle = data.provider === "telegram"
        ? (result.meta?.username ? `@${result.meta.username}` : null)
        : (result.meta?.name || null);
    }
    const status = result.ok ? "connected" : "disconnected";
    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: KEY_OF[data.provider],
        category_id: "social",
        status,
        credentials: merged,
        assigned_employees: data.assigned_employees ?? existing?.assigned_employees ?? [],
        last_test_status: result.ok ? "ok" : "fail",
        last_test_message: result.message,
        last_test_at: new Date().toISOString(),
        last_test_latency_ms: latency,
      }, { onConflict: "workspace_id,integration_key" })
      .select("id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at")
      .single();
    if (error) throw new Error(error.message);
    return rowToChannel(data.provider, row);
  });

export const testSocialChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: SocialProvider }) => {
    if (!input?.provider) throw new Error("provider required");
    return input;
  })
  .handler(async ({ data, context }): Promise<SocialChannel> => {
    const ws = await workspaceId(context);
    const { data: existing } = await context.supabase
      .from("integrations")
      .select("id,credentials,assigned_employees")
      .eq("workspace_id", ws).eq("integration_key", KEY_OF[data.provider])
      .maybeSingle();
    if (!existing) throw new Error("Not connected yet — save credentials first.");
    const started = Date.now();
    const result = await ping(data.provider, existing.credentials || {});
    const latency = Date.now() - started;
    const merged: any = { ...((existing.credentials as Record<string, any>) || {}) };
    if (result.ok) {
      merged.__handle = data.provider === "telegram"
        ? (result.meta?.username ? `@${result.meta.username}` : merged.__handle)
        : (result.meta?.name || merged.__handle);
    }
    const { data: row, error } = await context.supabase
      .from("integrations")
      .update({
        status: result.ok ? "connected" : "disconnected",
        credentials: merged,
        last_test_status: result.ok ? "ok" : "fail",
        last_test_message: result.message,
        last_test_at: new Date().toISOString(),
        last_test_latency_ms: latency,
      })
      .eq("id", existing.id)
      .select("id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at")
      .single();
    if (error) throw new Error(error.message);
    return rowToChannel(data.provider, row);
  });

export const disconnectSocialChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: SocialProvider }) => {
    if (!input?.provider) throw new Error("provider required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const { error } = await context.supabase
      .from("integrations")
      .delete()
      .eq("workspace_id", ws)
      .eq("integration_key", KEY_OF[data.provider]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
