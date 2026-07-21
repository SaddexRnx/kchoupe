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
    const { safeFetch } = await import("./ssrf-guard.server");
    const r = await safeFetch(`https://${host}/admin/api/2024-10/shop.json`, {
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
    const { safeFetch } = await import("./ssrf-guard.server");
    const r = await safeFetch(`${base}/wp-json/wc/v3/system_status`, { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } });
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
    const { safeFetch } = await import("./ssrf-guard.server");
    const r = await safeFetch(url);
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

// ── Website product scraping ─────────────────────────────────
// Fetches the site + a few linked product pages, extracts JSON-LD Product
// entries (Shopify, WooCommerce, Squarespace, most CMSs emit these) plus
// OpenGraph product tags, and bulk-imports them into the products table.

type ScrapedProduct = {
  name: string;
  price: number;
  currency: string;
  description?: string;
  image?: string;
  sku?: string;
  url?: string;
};

function absUrl(href: string, base: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function parsePrice(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractJsonLdProducts(html: string, pageUrl: string): ScrapedProduct[] {
  const out: ScrapedProduct[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let parsed: any;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes: any[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n !== "object") return;
      if (n["@graph"]) walk(n["@graph"]);
      nodes.push(n);
    };
    walk(parsed);
    for (const n of nodes) {
      const type = n["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;
      const offers = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      const price = parsePrice(offers?.price ?? offers?.lowPrice ?? n.price);
      const currency = offers?.priceCurrency || n.priceCurrency || "";
      const name = typeof n.name === "string" ? n.name.trim() : "";
      if (!name || price == null) continue;
      const image = Array.isArray(n.image) ? n.image[0] : n.image;
      out.push({
        name, price, currency: currency || "",
        description: typeof n.description === "string" ? n.description.slice(0, 500) : undefined,
        image: typeof image === "string" ? image : image?.url,
        sku: typeof n.sku === "string" ? n.sku : undefined,
        url: typeof n.url === "string" ? absUrl(n.url, pageUrl) ?? pageUrl : pageUrl,
      });
    }
  }
  return out;
}

function extractOgProduct(html: string, pageUrl: string): ScrapedProduct | null {
  const meta = (prop: string) => {
    const r = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = html.match(r); return m ? m[1] : null;
  };
  const type = meta("og:type");
  if (!type || !/product/i.test(type)) return null;
  const name = meta("og:title") || meta("twitter:title");
  const price = parsePrice(meta("product:price:amount") || meta("og:price:amount"));
  if (!name || price == null) return null;
  return {
    name: name.trim(), price,
    currency: meta("product:price:currency") || meta("og:price:currency") || "",
    description: meta("og:description") || undefined,
    image: meta("og:image") || undefined,
    url: pageUrl,
  };
}

function discoverProductLinks(html: string, baseUrl: string, maxLinks: number): string[] {
  const links = new Set<string>();
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  const baseHost = new URL(baseUrl).host;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && links.size < maxLinks * 3) {
    const abs = absUrl(m[1], baseUrl);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      if (u.host !== baseHost) continue;
      if (/\/(products?|shop|item|collections?\/[^/]+\/products?)\//i.test(u.pathname)) {
        u.hash = ""; u.search = "";
        links.add(u.toString());
      }
    } catch {}
  }
  return Array.from(links).slice(0, maxLinks);
}

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchText(url: string, timeoutMs = 12000): Promise<{ ok: boolean; status: number; body: string | null }> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, status: r.status, body: null };
    return { ok: true, status: r.status, body: await r.text() };
  } catch { return { ok: false, status: 0, body: null }; }
}

function extractSitemapProductUrls(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const u = m[1].trim();
    if (/\/products\//i.test(u)) out.push(u);
  }
  return out;
}

export const scrapeWebsiteProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ found: number; inserted: number; skipped: number; pages_scanned: number; sample: string[]; log: string[] }> => {
    const ws = await workspaceId(context);
    const { data: integ } = await context.supabase
      .from("integrations")
      .select("credentials")
      .eq("workspace_id", ws).eq("integration_key", KEY_OF.website)
      .maybeSingle();
    const url = (integ?.credentials as any)?.url;
    if (!url) throw new Error("Connect a website URL first.");

    const scraped: ScrapedProduct[] = [];
    const log: string[] = [];
    let scanned = 0;
    const host = new URL(url).origin;

    // Shopify fast-path: paginate /products.json
    let shopifyHit = false;
    for (let page = 1; page <= 10; page++) {
      const r = await fetchText(`${host}/products.json?limit=250&page=${page}`, 10000);
      if (!r.ok || !r.body) { if (page === 1) log.push(`products.json → HTTP ${r.status}`); break; }
      let j: any; try { j = JSON.parse(r.body); } catch { break; }
      const arr = Array.isArray(j?.products) ? j.products : [];
      if (arr.length === 0) break;
      shopifyHit = true;
      for (const p of arr) {
        const variant = p.variants?.[0];
        const price = parsePrice(variant?.price ?? p.price);
        if (!p.title || price == null) continue;
        scraped.push({
          name: String(p.title).trim(),
          price,
          currency: variant?.presentment_prices?.[0]?.price?.currency_code || "USD",
          description: p.body_html ? p.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500) : undefined,
          image: p.images?.[0]?.src,
          sku: variant?.sku || `SHOP-${p.id}`,
          url: `${host}/products/${p.handle}`,
        });
      }
      log.push(`products.json p${page}: +${arr.length}`);
      if (arr.length < 250) break;
    }

    // Sitemap-driven URL discovery (fallback)
    const productUrls = new Set<string>();
    if (!shopifyHit) {
      const sm = await fetchText(`${host}/sitemap.xml`, 10000);
      if (sm.ok && sm.body) {
        const nested: string[] = [];
        const reLoc = /<loc>([^<]+)<\/loc>/gi;
        let mm: RegExpExecArray | null;
        while ((mm = reLoc.exec(sm.body))) {
          const u = mm[1].trim();
          if (/sitemap.*products/i.test(u)) nested.push(u);
          else if (/\/products\//i.test(u)) productUrls.add(u);
        }
        for (const n of nested.slice(0, 5)) {
          const child = await fetchText(n, 10000);
          if (child.ok && child.body) extractSitemapProductUrls(child.body).forEach((u) => productUrls.add(u));
        }
        log.push(`sitemap: ${productUrls.size} product URL(s)`);
      } else {
        log.push(`sitemap.xml → HTTP ${sm.status}`);
      }
    }

    // Homepage HTML: JSON-LD, OG, anchor discovery
    const home = await fetchText(url);
    if (home.ok && home.body) {
      scanned++;
      const ld = extractJsonLdProducts(home.body, url);
      scraped.push(...ld);
      const og = extractOgProduct(home.body, url);
      if (og) scraped.push(og);
      log.push(`home: JSON-LD ${ld.length}, OG ${og ? 1 : 0}`);
      discoverProductLinks(home.body, url, 30).forEach((l) => productUrls.add(l));
    } else if (!shopifyHit) {
      log.push(`home → HTTP ${home.status}`);
    }

    // Crawl product pages (only when Shopify JSON didn't cover it)
    if (!shopifyHit) {
      const list = Array.from(productUrls).slice(0, 30);
      for (let i = 0; i < list.length; i += 5) {
        const batch = list.slice(i, i + 5);
        const results = await Promise.all(batch.map((u) => fetchText(u)));
        results.forEach((res, idx) => {
          if (!res.ok || !res.body) return;
          scanned++;
          scraped.push(...extractJsonLdProducts(res.body, batch[idx]));
          const og = extractOgProduct(res.body, batch[idx]);
          if (og) scraped.push(og);
        });
      }
      log.push(`crawled ${Math.min(30, productUrls.size)} product page(s)`);
    }

    // Deduplicate by (sku||name)
    const dedup = new Map<string, ScrapedProduct>();
    for (const p of scraped) {
      const key = (p.sku || p.name).toLowerCase();
      const prev = dedup.get(key);
      if (!prev || (!prev.image && p.image)) dedup.set(key, p);
    }
    const unique = Array.from(dedup.values());
    if (unique.length === 0) {
      return { found: 0, inserted: 0, skipped: 0, pages_scanned: scanned, sample: [], log };
    }

    const rows = unique.map((p) => ({
      workspace_id: ws,
      sku: (p.sku && p.sku.trim()) || "WEB-" + Math.floor(Math.random() * 1e9).toString(36).toUpperCase(),
      name: p.name.slice(0, 200),
      category: "Website",
      price: p.price,
      currency: p.currency || "USD",
      stock: 0,
      status: "draft" as const,
      image_emoji: "🛍️",
      description: [p.description, p.image ? `Image: ${p.image}` : null, p.url ? `Source: ${p.url}` : null].filter(Boolean).join("\n\n") || null,
    }));
    const { data: inserted, error } = await context.supabase
      .from("products")
      .upsert(rows, { onConflict: "workspace_id,sku" })
      .select("id");
    if (error) throw new Error(error.message);

    return {
      found: unique.length,
      inserted: inserted?.length ?? 0,
      skipped: unique.length - (inserted?.length ?? 0),
      pages_scanned: scanned,
      sample: unique.slice(0, 5).map((p) => p.name),
      log,
    };
  });

// ── Messaging webhook configuration (Telegram + Meta) ──────────
import { randomBytes } from "crypto";

export type WebhookInfo = {
  provider: ProviderId;
  webhook_url: string;
  verify_token: string | null;   // meta only
  registered: boolean;
  message: string;
};

export const configureMessagingWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId; appOrigin: string }) => {
    if (!input?.provider) throw new Error("provider required");
    if (!/^https?:\/\//.test(input.appOrigin || "")) throw new Error("appOrigin required (https://…)");
    return input;
  })
  .handler(async ({ data, context }): Promise<WebhookInfo> => {
    const ws = await workspaceId(context);
    const { data: integ } = await context.supabase
      .from("integrations")
      .select("id,credentials")
      .eq("workspace_id", ws).eq("integration_key", KEY_OF[data.provider])
      .maybeSingle();
    if (!integ) throw new Error("Save credentials first.");

    // Telegram/Meta reject redirects (302), so rewrite Lovable's auth-bridged
    // preview origin (…lovableproject.com or id-preview--…lovable.app) into
    // the stable public host that serves the current build without auth.
    const rawOrigin = data.appOrigin.replace(/\/+$/, "");
    const origin = normalizePublicOrigin(rawOrigin);
    const creds: any = { ...(integ.credentials as any || {}) };

    if (data.provider === "telegram") {
      if (!creds.botToken) throw new Error("Missing bot token.");
      if (!creds.webhookSecret) creds.webhookSecret = randomBytes(24).toString("hex");
      const url = `${origin}/api/public/webhooks/telegram/${integ.id}`;
      const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(creds.botToken)}/setWebhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, secret_token: creds.webhookSecret, allowed_updates: ["message", "edited_message", "callback_query"] }),
      });
      const j: any = await r.json().catch(() => ({}));
      const ok = r.ok && j?.ok;
      await context.supabase.from("integrations").update({ credentials: creds }).eq("id", integ.id);
      return {
        provider: data.provider, webhook_url: url, verify_token: null,
        registered: !!ok, message: ok ? `Telegram is now delivering messages here.` : (j?.description || `Telegram rejected the webhook (HTTP ${r.status}).`),
      };
    }

    if (data.provider === "instagram" || data.provider === "facebook_page") {
      if (!creds.webhookVerifyToken) creds.webhookVerifyToken = randomBytes(16).toString("hex");
      const url = `${origin}/api/public/webhooks/meta/${integ.id}`;
      await context.supabase.from("integrations").update({ credentials: creds }).eq("id", integ.id);
      return {
        provider: data.provider, webhook_url: url, verify_token: creds.webhookVerifyToken,
        registered: false,
        message: `Add this URL + Verify Token in Meta Developers → Webhooks (${data.provider === "instagram" ? "instagram" : "messenger"} product).`,
      };
    }

    throw new Error("Provider does not support inbound webhooks.");
  });

export const getMessagingWebhookInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: ProviderId }) => input)
  .handler(async ({ data, context }) => {
    const ws = await workspaceId(context);
    const { data: integ } = await context.supabase
      .from("integrations").select("id,credentials")
      .eq("workspace_id", ws).eq("integration_key", KEY_OF[data.provider]).maybeSingle();
    if (!integ) return null;
    const creds: any = integ.credentials || {};
    return {
      integration_id: integ.id,
      has_webhook_secret: !!creds.webhookSecret,
      has_verify_token: !!creds.webhookVerifyToken,
      verify_token: creds.webhookVerifyToken ?? null,
    };
  });

function normalizePublicOrigin(input: string): string {
  try {
    const u = new URL(input);
    const host = u.hostname;
    // id-preview--<uuid>.lovable.app → project--<uuid>-dev.lovable.app
    let m = host.match(/^id-preview--([0-9a-f-]{36})\.lovable\.app$/i);
    if (m) return `https://project--${m[1]}-dev.lovable.app`;
    // <uuid>.lovableproject.com → project--<uuid>-dev.lovable.app
    m = host.match(/^([0-9a-f-]{36})\.lovableproject\.com$/i);
    if (m) return `https://project--${m[1]}-dev.lovable.app`;
    return `${u.protocol}//${u.host}`;
  } catch { return input; }
}
