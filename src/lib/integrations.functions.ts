import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStatus = "connected" | "reauth" | "disconnected";

export type IntegrationRow = {
  id: string;
  integration_key: string;
  category_id: string;
  status: IntegrationStatus;
  assigned_employees: string[];
  credentials: Record<string, string>; // secret fields returned as "__saved__" placeholder
  last_test_status: string | null;
  last_test_message: string | null;
  last_test_at: string | null;
  last_test_latency_ms: number | null;
  created_at: string;
  updated_at: string;
};

// Keys treated as secrets: never returned in plaintext to the client.
const SECRET_KEYS = new Set([
  "apiKey", "apiSecret", "secretKey", "accessToken", "authToken",
  "webhookSecret", "verifyToken", "signingSecret", "serviceAccount",
]);

const MASK = "__saved__";

function sanitize(creds: any): Record<string, string> {
  const out: Record<string, string> = {};
  const obj = creds && typeof creds === "object" && !Array.isArray(creds) ? creds : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "string" || v === "") continue;
    out[k] = SECRET_KEYS.has(k) ? MASK : v;
  }
  return out;
}

// Merge incoming credentials with the stored ones; keep existing secret when
// the client sends back the placeholder mask (i.e. left the field untouched).
function mergeCreds(existing: any, incoming: Record<string, string>): Record<string, string> {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const merged: Record<string, string> = { ...base } as Record<string, string>;
  for (const [k, v] of Object.entries(incoming || {})) {
    if (v === MASK) continue; // untouched secret
    if (v == null || v === "") { delete merged[k]; continue; }
    merged[k] = v;
  }
  return merged;
}

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationRow[]> => {
    const ws = await workspaceId(context);
    const { data, error } = await context.supabase
      .from("integrations")
      .select("id,integration_key,category_id,status,assigned_employees,credentials,last_test_status,last_test_message,last_test_at,last_test_latency_ms,created_at,updated_at")
      .eq("workspace_id", ws);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      assigned_employees: r.assigned_employees ?? [],
      credentials: sanitize(r.credentials),
    })) as IntegrationRow[];
  });

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    integration_key: string;
    category_id: string;
    status?: IntegrationStatus;
    credentials?: Record<string, string>;
    assigned_employees?: string[];
  }) => {
    if (!input?.integration_key?.trim()) throw new Error("integration_key required");
    if (!input?.category_id?.trim()) throw new Error("category_id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntegrationRow> => {
    const ws = await workspaceId(context);

    const { data: existing } = await context.supabase
      .from("integrations")
      .select("credentials")
      .eq("workspace_id", ws)
      .eq("integration_key", data.integration_key)
      .maybeSingle();

    const merged = mergeCreds(existing?.credentials ?? {}, data.credentials ?? {});

    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: data.integration_key,
        category_id: data.category_id,
        status: data.status ?? "connected",
        credentials: merged,
        assigned_employees: data.assigned_employees ?? [],
      }, { onConflict: "workspace_id,integration_key" })
      .select("id,integration_key,category_id,status,assigned_employees,credentials,last_test_status,last_test_message,last_test_at,last_test_latency_ms,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, assigned_employees: row.assigned_employees ?? [], credentials: sanitize(row.credentials) } as IntegrationRow;
  });

export const setIntegrationAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    integration_key: string;
    category_id: string;
    assigned_employees: string[];
  }) => {
    if (!input?.integration_key?.trim()) throw new Error("integration_key required");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntegrationRow> => {
    const ws = await workspaceId(context);

    // Upsert (default to connected) with new assignments only.
    const { data: existing } = await context.supabase
      .from("integrations")
      .select("id,status,credentials")
      .eq("workspace_id", ws)
      .eq("integration_key", data.integration_key)
      .maybeSingle();

    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: data.integration_key,
        category_id: data.category_id,
        status: existing?.status ?? "connected",
        credentials: existing?.credentials ?? {},
        assigned_employees: data.assigned_employees,
      }, { onConflict: "workspace_id,integration_key" })
      .select("id,integration_key,category_id,status,assigned_employees,credentials,last_test_status,last_test_message,last_test_at,last_test_latency_ms,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, assigned_employees: row.assigned_employees ?? [], credentials: sanitize(row.credentials) } as IntegrationRow;
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integration_key: string }) => {
    if (!input?.integration_key?.trim()) throw new Error("integration_key required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const { error } = await context.supabase
      .from("integrations")
      .delete()
      .eq("workspace_id", ws)
      .eq("integration_key", data.integration_key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integration_key: string; category_id: string }) => {
    if (!input?.integration_key?.trim()) throw new Error("integration_key required");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntegrationRow> => {
    const ws = await workspaceId(context);

    const { data: existing } = await context.supabase
      .from("integrations")
      .select("id,status,credentials,assigned_employees")
      .eq("workspace_id", ws)
      .eq("integration_key", data.integration_key)
      .maybeSingle();

    const started = Date.now();
    // Simulated handshake latency + deterministic outcomes based on saved state.
    await new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 400)));
    const latency = Date.now() - started;

    let status: "ok" | "fail" = "ok";
    let message: string | null = "Handshake successful.";
    if (!existing) { status = "fail"; message = "Not connected yet — save settings first."; }
    else if (existing.status === "reauth") { status = "fail"; message = "Credentials expired — re-authorize."; }
    else if (!existing.credentials || Object.keys(existing.credentials).length === 0) {
      status = "fail"; message = "No credentials on file.";
    }

    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: data.integration_key,
        category_id: data.category_id,
        status: existing?.status ?? (status === "ok" ? "connected" : "disconnected"),
        credentials: existing?.credentials ?? {},
        assigned_employees: existing?.assigned_employees ?? [],
        last_test_status: status,
        last_test_message: message,
        last_test_at: new Date().toISOString(),
        last_test_latency_ms: latency,
      }, { onConflict: "workspace_id,integration_key" })
      .select("id,integration_key,category_id,status,assigned_employees,credentials,last_test_status,last_test_message,last_test_at,last_test_latency_ms,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, assigned_employees: row.assigned_employees ?? [], credentials: sanitize(row.credentials) } as IntegrationRow;
  });

export const reauthIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integration_key: string; category_id: string }) => {
    if (!input?.integration_key?.trim()) throw new Error("integration_key required");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntegrationRow> => {
    const ws = await workspaceId(context);
    await new Promise((r) => setTimeout(r, 400));
    const { data: existing } = await context.supabase
      .from("integrations")
      .select("credentials,assigned_employees")
      .eq("workspace_id", ws)
      .eq("integration_key", data.integration_key)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: data.integration_key,
        category_id: data.category_id,
        status: "connected",
        credentials: existing?.credentials ?? {},
        assigned_employees: existing?.assigned_employees ?? [],
      }, { onConflict: "workspace_id,integration_key" })
      .select("id,integration_key,category_id,status,assigned_employees,credentials,last_test_status,last_test_message,last_test_at,last_test_latency_ms,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, assigned_employees: row.assigned_employees ?? [], credentials: sanitize(row.credentials) } as IntegrationRow;
  });