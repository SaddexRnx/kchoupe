import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Real handshake tests for every provider Atlas supports.
// Tokens live in the `integrations` row credentials JSONB, workspace-scoped by RLS.
// Keeping the filename `social.functions.ts` to avoid churn — despite the name,
// this now covers commerce (Shopify / WooCommerce / Website) too.

export type ProviderId =
  | "telegram"
  | "whatsapp"
  | "facebook_page"
  | "instagram"
  | "shopify"
  | "woocommerce"
  | "website";

// Kept as an alias for backward compat with old imports (channels page removed).
export type SocialProvider = ProviderId;

export type ProviderCategory = "messaging" | "sales";

export type ProviderField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  required?: boolean;
  help?: string;
};

export type ProviderMeta = {
  id: ProviderId;
  category: ProviderCategory;
  title: string;
  blurb: string;
  helpUrl: string;
  fields: ProviderField[];
  // Which credential keys must be present for a save/test to be possible.
  requiredKeys: string[];
};

export const PROVIDERS: ProviderMeta[] = [
  // ── Sales channels ─────────────────────────────────────────
  {
    id: "shopify",
    category: "sales",
    title: "Shopify",
    blurb: "Sync catalog, inventory and orders from your Shopify store. We ping /admin/api/2024-10/shop.json.",
    helpUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
    requiredKeys: ["shopDomain", "adminAccessToken"],
    fields: [
      { key: "shopDomain", label: "Shop domain", placeholder: "your-shop.myshopify.com", required: true, help: "Just the myshopify.com host — no https:// and no trailing slash." },
      { key: "adminAccessToken", label: "Admin API access token", placeholder: "shpat_…", secret: true, required: true, help: "Custom app → Admin API access token (needs read_products, read_orders)." },
    ],
  },
  {
    id: "woocommerce",
    category: "sales",
    title: "WooCommerce",
    blurb: "Any WordPress store. We ping /wp-json/wc/v3/system_status with your read-only keys.",
    helpUrl: "https://woocommerce.com/document/woocommerce-rest-api/",
    requiredKeys: ["siteUrl", "consumerKey", "consumerSecret"],
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yourshop.com", required: true },
      { key: "consumerKey", label: "Consumer key", placeholder: "ck_…", required: true },
      { key: "consumerSecret", label: "Consumer secret", placeholder: "cs_…", secret: true, required: true },
    ],
  },
  {
    id: "website",
    category: "sales",
    title: "Website URL",
    blurb: "Point Atlas at any public URL — landing page, catalog, blog. We fetch it to confirm it's reachable and indexable.",
    helpUrl: "",
    requiredKeys: ["url"],
    fields: [
      { key: "url", label: "URL", placeholder: "https://yourbrand.com", required: true, help: "Used for the AI assistant's product/context grounding." },
    ],
  },

  // ── Messaging channels ────────────────────────────────────
  {
    id: "whatsapp",
    category: "messaging",
    title: "WhatsApp Business",
    blurb: "Meta Cloud API. We call graph.facebook.com/{phone_number_id} to verify the number + token.",
    helpUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    requiredKeys: ["phoneNumberId", "accessToken"],
    fields: [
      { key: "phoneNumberId", label: "Phone number ID", placeholder: "1234567890", required: true, help: "Meta app → WhatsApp → API setup." },
      { key: "accessToken", label: "Access token", placeholder: "EAAG…", secret: true, required: true, help: "System-user or long-lived token with whatsapp_business_messaging." },
    ],
  },
  {
    id: "facebook_page",
    category: "messaging",
    title: "Facebook Page",
    blurb: "Messenger DMs + comments. We ping the Graph API /me endpoint to verify the page token.",
    helpUrl: "https://developers.facebook.com/docs/pages-api",
    requiredKeys: ["pageAccessToken"],
    fields: [
      { key: "pageAccessToken", label: "Page access token", placeholder: "EAAG…", secret: true, required: true },
    ],
  },
  {
    id: "instagram",
    category: "messaging",
    title: "Instagram (Business)",
    blurb: "Uses the Facebook Page token linked to your IG Business account. We verify the IG account is attached.",
    helpUrl: "https://developers.facebook.com/docs/instagram-api",
    requiredKeys: ["pageAccessToken"],
    fields: [
      { key: "pageAccessToken", label: "Linked Page access token", placeholder: "EAAG…", secret: true, required: true, help: "The same page token as your Facebook Page — the IG business account must be linked to that page." },
    ],
  },
  {
    id: "telegram",
    category: "messaging",
    title: "Telegram Bot",
    blurb: "Create a bot with @BotFather and paste the token. We call getMe to verify.",
    helpUrl: "https://core.telegram.org/bots#botfather",
    requiredKeys: ["botToken"],
    fields: [
      { key: "botToken", label: "Bot token", placeholder: "123456:ABC-DEF…", secret: true, required: true },
    ],
  },
];

// ── Handshake dispatch ───────────────────────────────────────
// `code` is a stable machine-readable category so the UI can render a chip
// and suggest a concrete fix without re-parsing the provider's error string.
export type PingCode =
  | "ok"
  | "network"          // DNS / TCP / TLS / fetch failure
  | "auth"             // 401 / invalid token
  | "forbidden"        // 403 / missing scope
  | "not_found"        // 404 / wrong id
  | "rate_limit"       // 429
  | "server_error"     // 5xx
  | "bad_format"       // input validation
  | "unlinked"         // e.g. IG business account not linked
  | "unknown";

type PingResult = { ok: boolean; message: string; code: PingCode; hint?: string; meta?: any };

const HINTS: Partial<Record<PingCode, string>> = {
  network: "We couldn't reach the provider. Check the URL/host, your network, and that the endpoint is publicly reachable.",
  auth: "The token was rejected. Regenerate it in the provider dashboard and paste the new value — long-lived / system-user tokens are safest.",
  forbidden: "The token is valid but doesn't have permission for this call. Grant the required scopes/roles, then reconnect.",
  not_found: "The provider returned 404. Double-check IDs (phone number id, shop domain, endpoint path) — a typo is the most common cause.",
  rate_limit: "The provider is rate-limiting us. Wait a minute and hit Test again.",
  server_error: "The provider had a 5xx error. It's usually transient — try again in a bit.",
  bad_format: "One of the fields isn't in the expected shape. Fix the highlighted field and save again.",
  unlinked: "The credentials are valid but the two accounts aren't linked on the provider side. Follow the docs to attach them.",
  unknown: "We couldn't classify this error. Read the raw message below or open the provider docs for context.",
};

function codeFromStatus(status: number): PingCode {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server_error";
  if (status >= 400) return "unknown";
  return "ok";
}

async function safeJson(r: Response) { try { return await r.json(); } catch { return {}; } }

function withHint(r: Omit<PingResult, "hint">): PingResult {
  return { ...r, hint: r.code === "ok" ? undefined : HINTS[r.code] };
}

function metaCode(err: any, status: number): PingCode {
  const t = String(err?.type || "").toLowerCase();
  const sub = err?.error_subcode;
  if (t.includes("oauth") || sub === 463 || sub === 467 || status === 401) return "auth";
  if (status === 403 || sub === 200) return "forbidden";
  if (status === 404) return "not_found";
  return codeFromStatus(status);
}

async function pingTelegram(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(c.botToken)}/getMe`);
    const j: any = await safeJson(r);
    if (!r.ok || !j?.ok) {
      const code: PingCode = r.status === 401 || j?.error_code === 401 ? "auth" : codeFromStatus(r.status || 500);
      return withHint({ ok: false, code, message: j?.description || `HTTP ${r.status}` });
    }
    return withHint({ ok: true, code: "ok", message: `Connected as @${j.result?.username ?? "bot"}`, meta: { handle: j.result?.username ? `@${j.result.username}` : null } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingFacebookPage(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${encodeURIComponent(c.pageAccessToken)}`);
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return withHint({ ok: false, code: metaCode(j?.error, r.status), message: j?.error?.message || `HTTP ${r.status}` });
    return withHint({ ok: true, code: "ok", message: `Connected to page "${j.name}"`, meta: { handle: j.name || null } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingInstagram(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(c.pageAccessToken)}`);
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return withHint({ ok: false, code: metaCode(j?.error, r.status), message: j?.error?.message || `HTTP ${r.status}` });
    const ig = j?.instagram_business_account;
    if (!ig) return withHint({ ok: false, code: "unlinked", message: "Page has no linked Instagram Business account." });
    return withHint({ ok: true, code: "ok", message: `Linked to @${ig.username}`, meta: { handle: `@${ig.username}` } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingWhatsApp(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(c.phoneNumberId)}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return withHint({ ok: false, code: metaCode(j?.error, r.status), message: j?.error?.message || `HTTP ${r.status}` });
    return withHint({ ok: true, code: "ok", message: `Verified ${j.display_phone_number || j.verified_name}`, meta: { handle: j.display_phone_number || null } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingShopify(c: any): Promise<PingResult> {
  try {
    const host = String(c.shopDomain || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!/\.myshopify\.com$/.test(host)) return withHint({ ok: false, code: "bad_format", message: "Shop domain must end with .myshopify.com" });
    const r = await fetch(`https://${host}/admin/api/2024-10/shop.json`, {
      headers: { "X-Shopify-Access-Token": String(c.adminAccessToken || ""), Accept: "application/json" },
    });
    const j: any = await safeJson(r);
    if (!r.ok) return withHint({ ok: false, code: codeFromStatus(r.status), message: j?.errors ? JSON.stringify(j.errors) : `HTTP ${r.status}` });
    return withHint({ ok: true, code: "ok", message: `Store "${j?.shop?.name}" · ${j?.shop?.currency}`, meta: { handle: j?.shop?.name || host } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingWoo(c: any): Promise<PingResult> {
  try {
    const base = String(c.siteUrl || "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) return withHint({ ok: false, code: "bad_format", message: "Site URL must start with https://" });
    const auth = Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
    const r = await fetch(`${base}/wp-json/wc/v3/system_status`, { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } });
    if (r.status === 404) return withHint({ ok: false, code: "not_found", message: "wp-json not found — enable pretty permalinks and the WooCommerce REST API." });
    const j: any = await safeJson(r);
    if (!r.ok) return withHint({ ok: false, code: codeFromStatus(r.status), message: j?.message || `HTTP ${r.status}` });
    const env = j?.environment;
    return withHint({ ok: true, code: "ok", message: `WooCommerce ${env?.version ?? ""} · ${env?.site_url ?? base}`, meta: { handle: env?.site_url || base } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function pingWebsite(c: any): Promise<PingResult> {
  try {
    const url = String(c.url || "").trim();
    if (!/^https?:\/\//.test(url)) return withHint({ ok: false, code: "bad_format", message: "URL must start with http:// or https://" });
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return withHint({ ok: false, code: codeFromStatus(r.status), message: `HTTP ${r.status}` });
    const text = (await r.text()).slice(0, 20000);
    const m = text.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
    const title = m ? m[1].trim() : new URL(url).host;
    return withHint({ ok: true, code: "ok", message: `Reachable · "${title}"`, meta: { handle: title } });
  } catch (e: any) { return withHint({ ok: false, code: "network", message: e?.message || "Network error" }); }
}

async function ping(provider: ProviderId, creds: any): Promise<PingResult> {
  switch (provider) {
    case "telegram": return pingTelegram(creds);
    case "facebook_page": return pingFacebookPage(creds);
    case "instagram": return pingInstagram(creds);
    case "whatsapp": return pingWhatsApp(creds);
    case "shopify": return pingShopify(creds);
    case "woocommerce": return pingWoo(creds);
    case "website": return pingWebsite(creds);
    default: return withHint({ ok: false, code: "unknown", message: "Unknown provider" });
  }
}

// ── Storage helpers ──────────────────────────────────────────
export type ProviderConnection = {
  id: string | null;
  provider: ProviderId;
  category: ProviderCategory;
  connected: boolean;
  status: "connected" | "disconnected" | "reauth";
  handle: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  last_test_at: string | null;
  last_test_code: PingCode | null;
  last_test_hint: string | null;
  last_test_latency_ms: number | null;
  assigned_employees: string[];
  has_credentials: boolean;
  present_keys: string[];       // which cred keys are stored
  missing_keys: string[];       // required keys not yet provided
};

// Old export name kept so any lingering imports don't fail typecheck.
export type SocialChannel = ProviderConnection;

const KEY_OF: Record<ProviderId, string> = {
  telegram: "Telegram Bot",
  whatsapp: "WhatsApp Business",
  facebook_page: "Facebook Page",
  instagram: "Instagram Business",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  website: "Website URL",
};

const CATEGORY_OF: Record<ProviderId, ProviderCategory> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.category])
) as Record<ProviderId, ProviderCategory>;

const REQUIRED_OF: Record<ProviderId, string[]> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.requiredKeys])
) as Record<ProviderId, string[]>;

async function workspaceId(ctx: { supabase: any }): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("ensure_default_workspace");
  if (error) throw new Error(error.message);
  return data as string;
}

function rowToConn(provider: ProviderId, r: any | null): ProviderConnection {
  const cat = CATEGORY_OF[provider];
  const req = REQUIRED_OF[provider];
  if (!r) return {
    id: null, provider, category: cat, connected: false, status: "disconnected", handle: null,
    last_test_status: null, last_test_message: null, last_test_at: null,
    last_test_code: null, last_test_hint: null, last_test_latency_ms: null,
    assigned_employees: [], has_credentials: false, present_keys: [], missing_keys: req,
  };
  const creds = r.credentials ?? {};
  const diag = creds.__diag ?? {};
  const hasAll = req.every((k) => !!creds[k]);
  return {
    id: r.id, provider, category: cat,
    connected: r.status === "connected",
    status: r.status,
    handle: creds.__handle || null,
    last_test_status: r.last_test_status,
    last_test_message: r.last_test_message,
    last_test_at: r.last_test_at,
    last_test_code: (diag.code as PingCode) ?? null,
    last_test_hint: diag.hint ?? null,
    last_test_latency_ms: r.last_test_latency_ms ?? diag.latency_ms ?? null,
    assigned_employees: r.assigned_employees ?? [],
    has_credentials: hasAll,
    present_keys: Object.keys(creds).filter((k) => k !== "__handle" && k !== "__diag"),
    missing_keys: req.filter((k) => !creds[k]),
  };
}

const CONN_SELECT = "id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at,last_test_latency_ms";

// ── Server functions ─────────────────────────────────────────
export const listProviderConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProviderConnection[]> => {
    const ws = await workspaceId(context);
    const out: ProviderConnection[] = [];
    for (const p of PROVIDERS) {
      const { data } = await context.supabase
        .from("integrations")
        .select(CONN_SELECT)
        .eq("workspace_id", ws).eq("integration_key", KEY_OF[p.id])
        .maybeSingle();
      out.push(rowToConn(p.id, data));
    }
    return out;
  });

// Kept for backward compat.
export const listSocialChannels = listProviderConnections;

export const saveProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId; credentials: Record<string, string>; assigned_employees?: string[] }) => {
    if (!input?.provider) throw new Error("provider required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProviderConnection> => {
    const ws = await workspaceId(context);
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
    const missing = REQUIRED_OF[data.provider].filter((k) => !merged[k]);
    if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);

    const started = Date.now();
    const result = await ping(data.provider, merged);
    const latency = Date.now() - started;
    if (result.ok && result.meta?.handle) merged.__handle = result.meta.handle;
    merged.__diag = { code: result.code, hint: result.hint ?? null, latency_ms: latency, checked_at: new Date().toISOString() };

    const category_id = CATEGORY_OF[data.provider] === "sales" ? "commerce" : "social";
    const { data: row, error } = await context.supabase
      .from("integrations")
      .upsert({
        workspace_id: ws,
        integration_key: KEY_OF[data.provider],
        category_id,
        status: result.ok ? "connected" : "disconnected",
        credentials: merged,
        assigned_employees: data.assigned_employees ?? existing?.assigned_employees ?? [],
        last_test_status: result.ok ? "ok" : "fail",
        last_test_message: result.message,
        last_test_at: new Date().toISOString(),
        last_test_latency_ms: latency,
      }, { onConflict: "workspace_id,integration_key" })
      .select(CONN_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return rowToConn(data.provider, row);
  });
export const saveSocialChannel = saveProviderConnection;

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId }) => {
    if (!input?.provider) throw new Error("provider required");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProviderConnection> => {
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
    if (result.ok && result.meta?.handle) merged.__handle = result.meta.handle;
    merged.__diag = { code: result.code, hint: result.hint ?? null, latency_ms: latency, checked_at: new Date().toISOString() };
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
      .select(CONN_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return rowToConn(data.provider, row);
  });
export const testSocialChannel = testProviderConnection;

export const disconnectProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId }) => {
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
export const disconnectSocialChannel = disconnectProviderConnection;
