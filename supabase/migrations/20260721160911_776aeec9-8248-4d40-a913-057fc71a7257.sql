
-- Rate limiting table (per user + bucket, sliding fixed window)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (via SECURITY DEFINER RPC) touches this.

-- Security events log (admin-visible)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID,
  kind TEXT NOT NULL,           -- 'rate_limit_block','2fa_required','2fa_verified','2fa_failed','admin_action'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info','warn','critical'
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_kind_idx ON public.security_events (kind, created_at DESC);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins can read security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2FA verification session on profile (short-lived "verified until")
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_verified_until TIMESTAMPTZ;

-- Rate limit RPC (definer, single call, atomic upsert)
CREATE OR REPLACE FUNCTION public.rate_limit_hit(_bucket text, _limit int, _window_seconds int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ws timestamptz;
  _count int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  _ws := date_trunc('second', now()) - (extract(epoch from now())::bigint % _window_seconds) * interval '1 second';
  INSERT INTO public.rate_limits(user_id, bucket, window_start, count)
    VALUES (_uid, _bucket, _ws, 1)
    ON CONFLICT (user_id, bucket, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING count INTO _count;
  DELETE FROM public.rate_limits
    WHERE user_id = _uid AND bucket = _bucket AND window_start < now() - (_window_seconds * 2 || ' seconds')::interval;
  IF _count > _limit THEN
    INSERT INTO public.security_events(user_id, kind, severity, detail)
      VALUES (_uid, 'rate_limit_block', 'warn', jsonb_build_object('bucket', _bucket, 'count', _count, 'limit', _limit));
    RETURN jsonb_build_object('allowed', false, 'count', _count, 'limit', _limit, 'reset_at', _ws + (_window_seconds || ' seconds')::interval);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'count', _count, 'limit', _limit, 'reset_at', _ws + (_window_seconds || ' seconds')::interval);
END; $$;

-- 2FA verification helper (marks profile verified for N minutes)
CREATE OR REPLACE FUNCTION public.mark_2fa_verified(_minutes int DEFAULT 480)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  _until := now() + (_minutes || ' minutes')::interval;
  UPDATE public.profiles SET totp_verified_until = _until WHERE id = auth.uid();
  INSERT INTO public.security_events(user_id, kind, severity, detail)
    VALUES (auth.uid(), '2fa_verified', 'info', jsonb_build_object('until', _until));
  RETURN _until;
END; $$;

-- Log a generic security event (definer, caller = actor)
CREATE OR REPLACE FUNCTION public.log_security_event(_kind text, _severity text DEFAULT 'info', _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events(user_id, kind, severity, detail)
    VALUES (auth.uid(), _kind, coalesce(_severity,'info'), coalesce(_detail,'{}'::jsonb));
END; $$;

-- Aggregate stats for security dashboard
CREATE OR REPLACE FUNCTION public.admin_security_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'admins', (SELECT count(*) FROM public.user_roles WHERE role='admin'),
    '2fa_enabled_total', (SELECT count(*) FROM public.profiles WHERE totp_enabled = true),
    '2fa_enabled_admins', (SELECT count(*) FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id WHERE r.role='admin' AND p.totp_enabled = true),
    'admins_without_2fa', (SELECT count(*) FROM public.user_roles r LEFT JOIN public.profiles p ON p.id = r.user_id WHERE r.role='admin' AND COALESCE(p.totp_enabled,false) = false),
    'banned_users', (SELECT count(*) FROM public.profiles WHERE banned_at IS NOT NULL),
    'events_24h', (SELECT count(*) FROM public.security_events WHERE created_at > now() - interval '24 hours'),
    'events_7d', (SELECT count(*) FROM public.security_events WHERE created_at > now() - interval '7 days'),
    'blocks_24h', (SELECT count(*) FROM public.security_events WHERE kind='rate_limit_block' AND created_at > now() - interval '24 hours'),
    'critical_7d', (SELECT count(*) FROM public.security_events WHERE severity='critical' AND created_at > now() - interval '7 days'),
    'by_kind_7d', (SELECT COALESCE(jsonb_object_agg(kind, c), '{}'::jsonb) FROM (SELECT kind, count(*) c FROM public.security_events WHERE created_at > now() - interval '7 days' GROUP BY kind) x),
    'recent', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]'::jsonb)
               FROM (SELECT id, user_id, kind, severity, detail, created_at FROM public.security_events ORDER BY created_at DESC LIMIT 50) e),
    'audit_recent', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
                     FROM (SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 50) a)
  ) INTO r;
  RETURN r;
END; $$;

GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_2fa_verified(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_security_stats() TO authenticated;
