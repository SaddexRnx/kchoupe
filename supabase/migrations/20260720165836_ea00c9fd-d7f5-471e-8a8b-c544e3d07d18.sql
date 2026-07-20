CREATE OR REPLACE FUNCTION public.admin_list_workspaces()
 RETURNS TABLE(id uuid, name text, plan text, trial_ends_at timestamp with time zone, currency text, country text, created_at timestamp with time zone, member_count bigint, employee_count bigint, order_count bigint, revenue numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT w.id, w.name, w.plan, w.trial_ends_at, w.currency, w.country, w.created_at,
    (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id),
    (SELECT count(*) FROM public.ai_employees e WHERE e.workspace_id = w.id),
    (SELECT count(*) FROM public.orders o WHERE o.workspace_id = w.id),
    (SELECT COALESCE(SUM(amount),0) FROM public.orders o WHERE o.workspace_id = w.id)
  FROM public.workspaces w
  ORDER BY w.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'workspaces', (SELECT count(*) FROM public.workspaces),
    'users', (SELECT count(*) FROM public.profiles),
    'admins', (SELECT count(*) FROM public.user_roles WHERE role = 'admin'),
    'ai_employees', (SELECT count(*) FROM public.ai_employees),
    'products', (SELECT count(*) FROM public.products),
    'orders', (SELECT count(*) FROM public.orders),
    'revenue', (SELECT COALESCE(SUM(amount),0) FROM public.orders),
    'conversations', (SELECT count(*) FROM public.inbox_conversations),
    'messages', (SELECT count(*) FROM public.inbox_messages),
    'knowledge_sources', (SELECT count(*) FROM public.knowledge_sources),
    'integrations', (SELECT count(*) FROM public.integrations),
    'trials_active', (SELECT count(*) FROM public.workspaces WHERE plan = 'trial' AND trial_ends_at > now()),
    'trials_expired', (SELECT count(*) FROM public.workspaces WHERE plan = 'trial' AND trial_ends_at <= now()),
    'plan_breakdown', (SELECT COALESCE(jsonb_object_agg(plan, c), '{}'::jsonb) FROM (SELECT plan, count(*) c FROM public.workspaces GROUP BY plan) s),
    'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'orders_7d', (SELECT count(*) FROM public.orders WHERE created_at > now() - interval '7 days'),
    'revenue_7d', (SELECT COALESCE(SUM(amount),0) FROM public.orders WHERE created_at > now() - interval '7 days')
  ) INTO result;
  RETURN result;
END; $function$;