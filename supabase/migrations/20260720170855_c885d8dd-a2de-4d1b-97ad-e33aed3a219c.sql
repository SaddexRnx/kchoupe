CREATE OR REPLACE FUNCTION public.admin_timeseries()
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb; days jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;

  WITH d AS (
    SELECT generate_series((now()::date - interval '29 days')::date, now()::date, interval '1 day')::date AS day
  ),
  u AS (SELECT created_at::date d, count(*) c FROM public.profiles WHERE created_at > now() - interval '30 days' GROUP BY 1),
  o AS (SELECT created_at::date d, count(*) c, COALESCE(SUM(amount),0) rev FROM public.orders WHERE created_at > now() - interval '30 days' GROUP BY 1),
  m AS (SELECT created_at::date d, count(*) c FROM public.inbox_messages WHERE created_at > now() - interval '30 days' GROUP BY 1),
  w AS (SELECT created_at::date d, count(*) c FROM public.workspaces WHERE created_at > now() - interval '30 days' GROUP BY 1)
  SELECT jsonb_agg(jsonb_build_object(
    'day', to_char(d.day,'YYYY-MM-DD'),
    'users', COALESCE(u.c,0),
    'orders', COALESCE(o.c,0),
    'revenue', COALESCE(o.rev,0),
    'messages', COALESCE(m.c,0),
    'workspaces', COALESCE(w.c,0)
  ) ORDER BY d.day)
  INTO days
  FROM d
  LEFT JOIN u ON u.d = d.day
  LEFT JOIN o ON o.d = d.day
  LEFT JOIN m ON m.d = d.day
  LEFT JOIN w ON w.d = d.day;

  SELECT jsonb_build_object(
    'days', COALESCE(days, '[]'::jsonb),
    'channels', (SELECT COALESCE(jsonb_object_agg(channel, c), '{}'::jsonb) FROM (SELECT channel, count(*) c FROM public.inbox_conversations GROUP BY channel) x),
    'order_status', (SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb) FROM (SELECT status, count(*) c FROM public.orders GROUP BY status) x),
    'employee_status', (SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb) FROM (SELECT status, count(*) c FROM public.ai_employees GROUP BY status) x),
    'integration_status', (SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb) FROM (SELECT status, count(*) c FROM public.integrations GROUP BY status) x),
    'top_workspaces', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'revenue', rev, 'orders', ord) ORDER BY rev DESC), '[]'::jsonb)
      FROM (
        SELECT w.name, COALESCE(SUM(o.amount),0) rev, count(o.id) ord
        FROM public.workspaces w LEFT JOIN public.orders o ON o.workspace_id = w.id
        GROUP BY w.id, w.name ORDER BY rev DESC LIMIT 10
      ) x
    )
  ) INTO result;
  RETURN result;
END; $function$;