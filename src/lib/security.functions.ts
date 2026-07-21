// Security dashboard + 2FA challenge server fns.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit } from "@/lib/rate-limit.server";
import * as OTPAuth from "otpauth";

export const getSecurityStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase.rpc("admin_security_stats");
    if (error) throw new Error(error.message);
    return data as Record<string, any>;
  });

// Verifies a fresh TOTP code and marks the profile as 2FA-verified for 8h.
// Used at admin-panel entry and before privileged actions.
export const challenge2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => {
    if (!/^[0-9]{6}$/.test((i.code || "").trim())) throw new Error("Enter the 6-digit code");
    return { code: i.code.trim() };
  })
  .handler(async ({ data, context }) => {
    await enforceRateLimit(context.supabase, "2fa_verify", { limit: 10, windowSeconds: 300 });
    const { data: p, error } = await context.supabase
      .from("profiles").select("totp_enabled, totp_secret, totp_backup_codes")
      .eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!p?.totp_enabled || !p.totp_secret) throw new Error("2FA is not enabled on this account");
    let ok = false;
    const totp = new OTPAuth.TOTP({
      issuer: "KC",
      secret: OTPAuth.Secret.fromBase32(p.totp_secret),
    });
    if (totp.validate({ token: data.code, window: 1 }) !== null) ok = true;
    // Backup codes fallback (single-use)
    if (!ok && Array.isArray(p.totp_backup_codes)) {
      const idx = p.totp_backup_codes.indexOf(data.code);
      if (idx >= 0) {
        const remaining = [...p.totp_backup_codes];
        remaining.splice(idx, 1);
        await context.supabase.from("profiles")
          .update({ totp_backup_codes: remaining }).eq("id", context.userId);
        ok = true;
      }
    }
    if (!ok) {
      await context.supabase.rpc("log_security_event", {
        _kind: "2fa_failed", _severity: "warn", _detail: {},
      });
      throw new Error("Invalid code");
    }
    const { data: until } = await context.supabase.rpc("mark_2fa_verified", { _minutes: 480 });
    return { verifiedUntil: until as string };
  });

// Cheap status probe used by AdminGate / dashboard header.
export const get2FASession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: isAdmin }, { data: owned }] = await Promise.all([
      context.supabase.from("profiles")
        .select("totp_enabled, totp_verified_until").eq("id", context.userId).maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.from("workspaces").select("id").eq("owner_id", context.userId).limit(1),
    ]);
    const privileged = !!isAdmin || (owned && owned.length > 0);
    const until = profile?.totp_verified_until ? new Date(profile.totp_verified_until).getTime() : 0;
    return {
      enabled: !!profile?.totp_enabled,
      privileged: !!privileged,
      admin: !!isAdmin,
      verified: until > Date.now(),
      verifiedUntil: profile?.totp_verified_until ?? null,
    };
  });
