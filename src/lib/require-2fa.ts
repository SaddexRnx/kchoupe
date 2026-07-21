// Server-fn middleware that enforces a fresh TOTP verification for
// workspace owners AND platform admins. Non-privileged users pass through.
// Requires requireSupabaseAuth in the chain BEFORE this one.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const require2FA = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context as any;
    const [{ data: profile }, { data: isAdmin }, { data: ownedWs }] = await Promise.all([
      supabase.from("profiles").select("totp_enabled, totp_verified_until").eq("id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("workspaces").select("id").eq("owner_id", userId).limit(1),
    ]);
    const privileged = !!isAdmin || (ownedWs && ownedWs.length > 0);
    if (!privileged) return next();

    if (!profile?.totp_enabled) {
      await supabase.rpc("log_security_event", {
        _kind: "2fa_required",
        _severity: "warn",
        _detail: { reason: "not_enrolled" },
      });
      throw new Error("2FA_REQUIRED: enable two-factor authentication in Settings → Advanced to continue.");
    }
    const until = profile.totp_verified_until ? new Date(profile.totp_verified_until).getTime() : 0;
    if (until < Date.now()) {
      throw new Error("2FA_CHALLENGE: verify your authenticator code to continue.");
    }
    return next();
  });
