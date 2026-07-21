// Per-user DB-backed rate limiter. Call from inside a server fn handler
// that already has `context.supabase` (i.e. behind requireSupabaseAuth).
// Uses SECURITY DEFINER RPC `rate_limit_hit` under the hood.
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateBucket =
  | "playground_chat"
  | "custom_model_ping"
  | "translate"
  | "scrape"
  | "broadcast"
  | "backup"
  | "template_install"
  | "webhook_admin"
  | "2fa_verify"
  | "auth_sensitive";

export async function enforceRateLimit(
  supabase: SupabaseClient,
  bucket: RateBucket,
  opts: { limit: number; windowSeconds: number },
): Promise<void> {
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    _bucket: bucket,
    _limit: opts.limit,
    _window_seconds: opts.windowSeconds,
  });
  if (error) {
    // Fail-open on RPC error so a DB blip doesn't take down the API,
    // but log so admins see it in the security dashboard.
    console.warn("[rate-limit] rpc error", bucket, error.message);
    return;
  }
  const row = data as { allowed?: boolean; reset_at?: string; limit?: number };
  if (!row?.allowed) {
    const reset = row?.reset_at ? new Date(row.reset_at) : null;
    const secs = reset ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000)) : 60;
    throw new Error(`Too many requests — try again in ${secs}s.`);
  }
}
