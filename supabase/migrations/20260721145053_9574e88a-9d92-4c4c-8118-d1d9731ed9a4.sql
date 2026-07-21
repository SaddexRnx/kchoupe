
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, email text, display_name text, avatar_url text,
  created_at timestamp with time zone, last_sign_in_at timestamp with time zone,
  is_admin boolean, workspace_count bigint,
  employee_count bigint, product_count bigint, order_count bigint,
  revenue numeric, conversation_count bigint, message_count bigint,
  integration_count bigint, ticket_count bigint,
  plans text, currencies text, countries text,
  trial_ends_at timestamp with time zone,
  banned_at timestamp with time zone, ban_reason text,
  last_activity_at timestamp with time zone
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH ws AS (
    SELECT m.user_id, w.id AS wid, w.plan, w.currency, w.country, w.trial_ends_at
    FROM public.workspace_members m
    JOIN public.workspaces w ON w.id = m.workspace_id
  )
  SELECT
    u.id, u.email::text, p.display_name, p.avatar_url,
    u.created_at, u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS is_admin,
    (SELECT count(DISTINCT wid) FROM ws WHERE ws.user_id = u.id) AS workspace_count,
    (SELECT count(*) FROM public.ai_employees e WHERE e.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS employee_count,
    (SELECT count(*) FROM public.products pr WHERE pr.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS product_count,
    (SELECT count(*) FROM public.orders o WHERE o.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS order_count,
    COALESCE((SELECT sum(o.amount) FROM public.orders o WHERE o.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id) AND o.status IN ('paid','fulfilled','completed','delivered','confirmed')), 0) AS revenue,
    (SELECT count(*) FROM public.inbox_conversations c WHERE c.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS conversation_count,
    (SELECT count(*) FROM public.inbox_messages im WHERE im.conversation_id IN (SELECT c.id FROM public.inbox_conversations c WHERE c.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id))) AS message_count,
    (SELECT count(*) FROM public.integrations i WHERE i.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS integration_count,
    (SELECT count(*) FROM public.support_tickets t WHERE t.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)) AS ticket_count,
    (SELECT string_agg(DISTINCT plan, ', ') FROM ws WHERE ws.user_id = u.id) AS plans,
    (SELECT string_agg(DISTINCT currency, ', ') FROM ws WHERE ws.user_id = u.id) AS currencies,
    (SELECT string_agg(DISTINCT country, ', ') FROM ws WHERE ws.user_id = u.id AND country IS NOT NULL) AS countries,
    (SELECT max(trial_ends_at) FROM ws WHERE ws.user_id = u.id) AS trial_ends_at,
    p.banned_at, p.ban_reason,
    GREATEST(
      u.last_sign_in_at,
      (SELECT max(updated_at) FROM public.inbox_conversations c WHERE c.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id)),
      (SELECT max(created_at) FROM public.orders o WHERE o.workspace_id IN (SELECT wid FROM ws WHERE ws.user_id = u.id))
    ) AS last_activity_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_user_details(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(x) FROM (
      SELECT u.id, u.email::text AS email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
        u.raw_user_meta_data, p.display_name, p.avatar_url, p.locale, p.banned_at, p.ban_reason,
        EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS is_admin
      FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = _user_id
    ) x),
    'workspaces', (SELECT COALESCE(jsonb_agg(to_jsonb(w) ORDER BY w.created_at DESC), '[]'::jsonb) FROM (
      SELECT w.id, w.name, w.plan, w.trial_ends_at, w.currency, w.country, w.created_at,
        (SELECT count(*) FROM public.ai_employees e WHERE e.workspace_id = w.id) AS employees,
        (SELECT count(*) FROM public.products pr WHERE pr.workspace_id = w.id) AS products,
        (SELECT count(*) FROM public.orders o WHERE o.workspace_id = w.id) AS orders,
        COALESCE((SELECT sum(amount) FROM public.orders o WHERE o.workspace_id = w.id AND o.status IN ('paid','fulfilled','completed','delivered','confirmed')), 0) AS revenue,
        (SELECT count(*) FROM public.inbox_conversations c WHERE c.workspace_id = w.id) AS conversations,
        (SELECT count(*) FROM public.integrations i WHERE i.workspace_id = w.id) AS integrations
      FROM public.workspaces w
      WHERE w.id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
    ) w),
    'employees', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC), '[]'::jsonb) FROM (
      SELECT id, name, role, status, model, avatar_emoji, workspace_id, created_at
      FROM public.ai_employees WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
      LIMIT 100
    ) e),
    'recent_orders', (SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC), '[]'::jsonb) FROM (
      SELECT id, order_no, amount, currency, status, channel, customer_name, customer_email, created_at, workspace_id
      FROM public.orders WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
      ORDER BY created_at DESC LIMIT 25
    ) o),
    'recent_conversations', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC), '[]'::jsonb) FROM (
      SELECT id, channel, status, external_user, ai_employee_name, last_message, unread_count, updated_at, workspace_id
      FROM public.inbox_conversations WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
      ORDER BY updated_at DESC LIMIT 25
    ) c),
    'integrations', (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC), '[]'::jsonb) FROM (
      SELECT id, integration_key, category_id, status, workspace_id, created_at
      FROM public.integrations WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
    ) i),
    'tickets', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb) FROM (
      SELECT id, subject, status, priority, last_message_at, unread_for_admin, workspace_id, created_at
      FROM public.support_tickets WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)
    ) t),
    'totals', jsonb_build_object(
      'workspaces', (SELECT count(*) FROM public.workspace_members WHERE user_id = _user_id),
      'employees', (SELECT count(*) FROM public.ai_employees WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'products', (SELECT count(*) FROM public.products WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'orders', (SELECT count(*) FROM public.orders WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'revenue', COALESCE((SELECT sum(amount) FROM public.orders WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id) AND status IN ('paid','fulfilled','completed','delivered','confirmed')), 0),
      'conversations', (SELECT count(*) FROM public.inbox_conversations WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'messages', (SELECT count(*) FROM public.inbox_messages WHERE conversation_id IN (SELECT id FROM public.inbox_conversations WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id))),
      'integrations', (SELECT count(*) FROM public.integrations WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'tickets', (SELECT count(*) FROM public.support_tickets WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id)),
      'knowledge_sources', (SELECT count(*) FROM public.knowledge_sources WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id))
    )
  ) INTO result;

  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_user_details(uuid) TO authenticated;
