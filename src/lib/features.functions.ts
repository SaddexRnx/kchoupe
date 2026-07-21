// Consolidated server functions for the shipped feature bundle:
// - 2FA (TOTP)
// - GDPR export / delete
// - Workspace backup / restore
// - Referrals
// - Storefront toggle
// - Currency per workspace
// - Human handoff on conversations
// - Presence heartbeat
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ok = <T,>(v: T) => v;

/* ============ PRESENCE ============ */
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("touch_presence");
    return { ok: true };
  });

/* ============ 2FA ============ */
export const start2FASetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const secret = new OTPAuth.Secret({ size: 20 });
    const email = (claims as any)?.email ?? "user";
    const totp = new OTPAuth.TOTP({ issuer: "KC", label: email, secret });
    const uri = totp.toString();
    const qr = await QRCode.toDataURL(uri);
    // stash secret but don't enable until verify
    const { error } = await supabase
      .from("profiles")
      .update({ totp_secret: secret.base32 })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return ok({ secret: secret.base32, uri, qr });
  });

export const verify2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => {
    if (!/^\d{6}$/.test(i.code || "")) throw new Error("Enter the 6-digit code");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p, error: pErr } = await supabase
      .from("profiles").select("totp_secret").eq("id", userId).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!p?.totp_secret) throw new Error("Start 2FA setup first");
    const totp = new OTPAuth.TOTP({
      issuer: "KC",
      secret: OTPAuth.Secret.fromBase32(p.totp_secret),
    });
    const delta = totp.validate({ token: data.code, window: 1 });
    if (delta === null) throw new Error("Invalid code — try again");
    // generate 8 backup codes
    const backup = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6),
    );
    const { error } = await supabase
      .from("profiles")
      .update({ totp_enabled: true, totp_backup_codes: backup })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { enabled: true, backupCodes: backup };
  });

export const disable2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ totp_enabled: false, totp_secret: null, totp_backup_codes: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { enabled: false };
  });

export const get2FAStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles").select("totp_enabled").eq("id", context.userId).maybeSingle();
    return { enabled: !!data?.totp_enabled };
  });

/* ============ GDPR ============ */
export const requestDataExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, workspaces, orders, conversations, messages] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("workspace_members").select("workspace_id,role,workspaces(*)").eq("user_id", userId),
      supabase.from("orders").select("*").in("workspace_id",
        (await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId)).data?.map(w => w.workspace_id) ?? [""]),
      supabase.from("inbox_conversations").select("*").in("workspace_id",
        (await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId)).data?.map(w => w.workspace_id) ?? [""]),
      supabase.from("inbox_messages").select("*").in("workspace_id",
        (await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId)).data?.map(w => w.workspace_id) ?? [""]),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      workspaces: workspaces.data,
      orders: orders.data,
      conversations: conversations.data,
      messages: messages.data,
    };
    await supabase.from("gdpr_requests").insert({
      user_id: userId, kind: "export", status: "ready", payload, completed_at: new Date().toISOString(),
    });
    return payload;
  });

export const requestAccountDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { confirm: string }) => {
    if (i.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
    return i;
  })
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("gdpr_requests").insert({
      user_id: userId, kind: "delete", status: "pending",
    });
    // Best-effort: strip owned workspaces where user is sole owner
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({
      display_name: "Deleted user", avatar_url: null, banned_at: new Date().toISOString(), ban_reason: "self-delete",
    }).eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    return { queued: true };
  });

/* ============ WORKSPACE BACKUPS ============ */
export const createBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string; label?: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isOwner } = await supabase.rpc("is_workspace_owner",
      { _user_id: userId, _workspace_id: data.workspaceId });
    if (!isOwner) throw new Error("Only workspace owners can create backups");
    const wid = data.workspaceId;
    const [ws, prod, emp, integ, kb, learn] = await Promise.all([
      supabase.from("workspaces").select("*").eq("id", wid).maybeSingle(),
      supabase.from("products").select("*").eq("workspace_id", wid),
      supabase.from("ai_employees").select("*").eq("workspace_id", wid),
      supabase.from("integrations").select("id,integration_key,category_id,status,config").eq("workspace_id", wid),
      supabase.from("knowledge_sources").select("*").eq("workspace_id", wid),
      supabase.from("workspace_learnings").select("*").eq("workspace_id", wid),
    ]);
    const contents = {
      workspace: ws.data, products: prod.data, employees: emp.data,
      integrations: integ.data, knowledge: kb.data, learnings: learn.data,
    };
    const size = JSON.stringify(contents).length;
    const { data: row, error } = await supabase.from("workspace_backups").insert({
      workspace_id: wid, created_by: userId, label: data.label ?? `Backup ${new Date().toLocaleString()}`,
      size_bytes: size, contents,
    }).select("id,label,size_bytes,created_at").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workspace_backups").select("id,label,size_bytes,created_at")
      .eq("workspace_id", data.workspaceId).order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { backupId: string; workspaceId: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isOwner } = await supabase.rpc("is_workspace_owner",
      { _user_id: userId, _workspace_id: data.workspaceId });
    if (!isOwner) throw new Error("Only workspace owners can restore");
    const { data: bkp, error } = await supabase.from("workspace_backups")
      .select("contents,workspace_id").eq("id", data.backupId).maybeSingle();
    if (error || !bkp) throw new Error("Backup not found");
    if (bkp.workspace_id !== data.workspaceId) throw new Error("Backup / workspace mismatch");
    const c: any = bkp.contents;
    // Restore products (upsert by sku)
    if (Array.isArray(c.products) && c.products.length) {
      const rows = c.products.map((p: any) => ({ ...p, workspace_id: data.workspaceId }));
      await supabase.from("products").upsert(rows, { onConflict: "workspace_id,sku" });
    }
    if (Array.isArray(c.knowledge) && c.knowledge.length) {
      await supabase.from("knowledge_sources").upsert(
        c.knowledge.map((k: any) => ({ ...k, workspace_id: data.workspaceId })),
      );
    }
    return { restored: true };
  });

export const deleteBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { backupId: string }) => i)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workspace_backups").delete().eq("id", data.backupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ REFERRALS ============ */
export const getReferralStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
    const { data: rows } = await supabase.from("referrals").select("id,referred_id,reward_days,reward_applied,created_at")
      .eq("referrer_id", userId).order("created_at", { ascending: false });
    const totalDays = (rows ?? []).filter(r => r.reward_applied).reduce((s, r) => s + (r.reward_days || 0), 0);
    return { code: profile?.referral_code ?? null, referrals: rows ?? [], totalDaysEarned: totalDays };
  });

/* ============ STOREFRONT ============ */
export const updateStorefront = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string; enabled?: boolean; slug?: string; tagline?: string; logoUrl?: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isOwner } = await supabase.rpc("is_workspace_owner",
      { _user_id: userId, _workspace_id: data.workspaceId });
    if (!isOwner) throw new Error("Only workspace owners can edit the storefront");
    const patch: Record<string, unknown> = {};
    if (typeof data.enabled === "boolean") patch.storefront_enabled = data.enabled;
    if (data.tagline !== undefined) patch.storefront_tagline = data.tagline;
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    if (data.slug !== undefined) {
      const clean = data.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (clean.length < 3) throw new Error("Slug must be at least 3 characters");
      patch.slug = clean;
    }
    const { data: row, error } = await (supabase.from("workspaces") as any)
      .update(patch).eq("id", data.workspaceId)
      .select("id,slug,storefront_enabled,storefront_tagline,logo_url").single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============ CURRENCY ============ */
export const updateCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId: string; currency: string; country?: string }) => {
    if (!/^[A-Z]{3}$/.test(i.currency)) throw new Error("Currency must be a 3-letter ISO code (e.g. DZD, USD, EUR)");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isOwner } = await supabase.rpc("is_workspace_owner",
      { _user_id: userId, _workspace_id: data.workspaceId });
    if (!isOwner) throw new Error("Only workspace owners can change the currency");
    const { error } = await supabase.from("workspaces")
      .update({ currency: data.currency, ...(data.country ? { country: data.country } : {}) })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ HUMAN HANDOFF ============ */
export const takeOverConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { conversationId: string; takeOver: boolean }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("inbox_conversations").update({
      human_taken_over: data.takeOver,
      human_taken_by: data.takeOver ? userId : null,
      needs_human: data.takeOver ? false : undefined,
    }).eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ AUDIT LOG ============ */
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId?: string; limit?: number }) => i)
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("audit_log")
      .select("id,action,target_type,target_id,metadata,actor_email,created_at,ip")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 500));
    if (data.workspaceId) q.eq("workspace_id", data.workspaceId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const writeAuditEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { workspaceId?: string; action: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }) => {
    if (!i.action || i.action.length > 80) throw new Error("Invalid action");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { error } = await (supabase.from("audit_log") as any).insert({
      workspace_id: data.workspaceId ?? null,
      actor_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: data.action,
      target_type: data.targetType ?? null,
      target_id: data.targetId ?? null,
      metadata: (data.metadata ?? {}) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ TEMPLATES MARKETPLACE ============ */
export const listTemplates = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const c = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (u, i) => {
        const h = new Headers(i?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(u, { ...i, headers: h });
      }},
    });
    const { data } = await c.from("ai_employee_templates")
      .select("id,slug,title,category,description,suggested_model,avatar_emoji,featured,install_count")
      .order("featured", { ascending: false }).order("install_count", { ascending: false });
    return data ?? [];
  });

export const installTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { templateSlug: string; workspaceId: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isMember } = await supabase.rpc("is_workspace_member",
      { _user_id: userId, _workspace_id: data.workspaceId });
    if (!isMember) throw new Error("Not a workspace member");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tpl } = await supabaseAdmin.from("ai_employee_templates")
      .select("*").eq("slug", data.templateSlug).maybeSingle();
    if (!tpl) throw new Error("Template not found");
    const { data: emp, error } = await (supabase.from("ai_employees") as any).insert({
      workspace_id: data.workspaceId,
      created_by: userId,
      name: tpl.title,
      role: tpl.category,
      status: "active",
      model: tpl.suggested_model ?? undefined,
      avatar_emoji: tpl.avatar_emoji ?? undefined,
      system_prompt: tpl.system_prompt,
    }).select("id,name").single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("ai_employee_templates")
      .update({ install_count: (tpl.install_count || 0) + 1 })
      .eq("id", tpl.id);
    return emp;
  });
