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
type PingResult = { ok: boolean; message: string; meta?: any };

async function safeJson(r: Response) { try { return await r.json(); } catch { return {}; } }

async function pingTelegram(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(c.botToken)}/getMe`);
    const j: any = await safeJson(r);
    if (!r.ok || !j?.ok) return { ok: false, message: j?.description || `HTTP ${r.status}` };
    return { ok: true, message: `Connected as @${j.result?.username ?? "bot"}`, meta: { handle: j.result?.username ? `@${j.result.username}` : null } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingFacebookPage(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${encodeURIComponent(c.pageAccessToken)}`);
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return { ok: false, message: j?.error?.message || `HTTP ${r.status}` };
    return { ok: true, message: `Connected to page "${j.name}"`, meta: { handle: j.name || null } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingInstagram(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(c.pageAccessToken)}`);
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return { ok: false, message: j?.error?.message || `HTTP ${r.status}` };
    const ig = j?.instagram_business_account;
    if (!ig) return { ok: false, message: "Page has no linked Instagram Business account." };
    return { ok: true, message: `Linked to @${ig.username}`, meta: { handle: `@${ig.username}` } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingWhatsApp(c: any): Promise<PingResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(c.phoneNumberId)}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const j: any = await safeJson(r);
    if (!r.ok || j?.error) return { ok: false, message: j?.error?.message || `HTTP ${r.status}` };
    return { ok: true, message: `Verified ${j.display_phone_number || j.verified_name}`, meta: { handle: j.display_phone_number || null } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingShopify(c: any): Promise<PingResult> {
  try {
    const host = String(c.shopDomain || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!/\.myshopify\.com$/.test(host)) return { ok: false, message: "Shop domain must end with .myshopify.com" };
    const r = await fetch(`https://${host}/admin/api/2024-10/shop.json`, {
      headers: { "X-Shopify-Access-Token": String(c.adminAccessToken || ""), Accept: "application/json" },
    });
    const j: any = await safeJson(r);
    if (!r.ok) return { ok: false, message: j?.errors ? JSON.stringify(j.errors) : `HTTP ${r.status}` };
    return { ok: true, message: `Store "${j?.shop?.name}" · ${j?.shop?.currency}`, meta: { handle: j?.shop?.name || host } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingWoo(c: any): Promise<PingResult> {
  try {
    const base = String(c.siteUrl || "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) return { ok: false, message: "Site URL must start with https://" };
    const auth = Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
    const r = await fetch(`${base}/wp-json/wc/v3/system_status`, { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } });
    if (r.status === 404) return { ok: false, message: "wp-json not found — enable pretty permalinks and the WooCommerce REST API." };
    const j: any = await safeJson(r);
    if (!r.ok) return { ok: false, message: j?.message || `HTTP ${r.status}` };
    const env = j?.environment;
    return { ok: true, message: `WooCommerce ${env?.version ?? ""} · ${env?.site_url ?? base}`, meta: { handle: env?.site_url || base } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
}

async function pingWebsite(c: any): Promise<PingResult> {
  try {
    const url = String(c.url || "").trim();
    if (!/^https?:\/\//.test(url)) return { ok: false, message: "URL must start with http:// or https://" };
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return { ok: false, message: `HTTP ${r.status}` };
    const text = (await r.text()).slice(0, 20000);
    const m = text.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
    const title = m ? m[1].trim() : new URL(url).host;
    return { ok: true, message: `Reachable · "${title}"`, meta: { handle: title } };
  } catch (e: any) { return { ok: false, message: e?.message || "Network error" }; }
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
    default: return { ok: false, message: "Unknown provider" };
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
  assigned_employees: string[];
  has_credentials: boolean;
  present_keys: string[]; // which cred keys are stored (non-secret hint for UI)
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
  if (!r) return {
    id: null, provider, category: cat, connected: false, status: "disconnected", handle: null,
    last_test_status: null, last_test_message: null, last_test_at: null,
    assigned_employees: [], has_credentials: false, present_keys: [],
  };
  const creds = r.credentials ?? {};
  const req = REQUIRED_OF[provider];
  const hasAll = req.every((k) => !!creds[k]);
  return {
    id: r.id, provider, category: cat,
    connected: r.status === "connected",
    status: r.status,
    handle: creds.__handle || null,
    last_test_status: r.last_test_status,
    last_test_message: r.last_test_message,
    last_test_at: r.last_test_at,
    assigned_employees: r.assigned_employees ?? [],
    has_credentials: hasAll,
    present_keys: Object.keys(creds).filter((k) => k !== "__handle"),
  };
}

// ── Server functions ─────────────────────────────────────────
export const listProviderConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProviderConnection[]> => {
    const ws = await workspaceId(context);
    const out: ProviderConnection[] = [];
    for (const p of PROVIDERS) {
      const { data } = await context.supabase
        .from("integrations")
        .select("id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at")
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
    // Ensure required keys are present before we ping.
    const missing = REQUIRED_OF[data.provider].filter((k) => !merged[k]);
    if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);

    const started = Date.now();
    const result = await ping(data.provider, merged);
    const latency = Date.now() - started;
    if (result.ok && result.meta?.handle) merged.__handle = result.meta.handle;

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
      .select("id,status,credentials,assigned_employees,last_test_status,last_test_message,last_test_at")
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
