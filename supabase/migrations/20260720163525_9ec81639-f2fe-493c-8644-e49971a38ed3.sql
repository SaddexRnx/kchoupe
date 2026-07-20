
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'sadekplus@gmail.com' THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin'::public.app_role AND workspace_id IS NULL) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'sadekplus@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'::public.app_role AND r.workspace_id IS NULL);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspaces','workspace_members','profiles','user_roles',
    'ai_employees','products','orders','customers',
    'inbox_conversations','inbox_messages',
    'knowledge_sources','knowledge_chunks',
    'integrations','notifications',
    'playground_conversations','playground_messages'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Admins full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))',
      t
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
    'revenue', (SELECT COALESCE(SUM(total),0) FROM public.orders),
    'conversations', (SELECT count(*) FROM public.inbox_conversations),
    'messages', (SELECT count(*) FROM public.inbox_messages),
    'knowledge_sources', (SELECT count(*) FROM public.knowledge_sources),
    'integrations', (SELECT count(*) FROM public.integrations),
    'trials_active', (SELECT count(*) FROM public.workspaces WHERE plan = 'trial' AND trial_ends_at > now()),
    'trials_expired', (SELECT count(*) FROM public.workspaces WHERE plan = 'trial' AND trial_ends_at <= now()),
    'plan_breakdown', (SELECT COALESCE(jsonb_object_agg(plan, c), '{}'::jsonb) FROM (SELECT plan, count(*) c FROM public.workspaces GROUP BY plan) s),
    'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'orders_7d', (SELECT count(*) FROM public.orders WHERE created_at > now() - interval '7 days'),
    'revenue_7d', (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE created_at > now() - interval '7 days')
  ) INTO result;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, email text, display_name text, avatar_url text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, workspace_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, p.avatar_url, u.created_at, u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS is_admin,
    (SELECT count(*) FROM public.workspace_members m WHERE m.user_id = u.id) AS workspace_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_workspaces()
RETURNS TABLE (id uuid, name text, plan text, trial_ends_at timestamptz, currency text, country text, created_at timestamptz, member_count bigint, employee_count bigint, order_count bigint, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT w.id, w.name, w.plan, w.trial_ends_at, w.currency, w.country, w.created_at,
    (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = w.id),
    (SELECT count(*) FROM public.ai_employees e WHERE e.workspace_id = w.id),
    (SELECT count(*) FROM public.orders o WHERE o.workspace_id = w.id),
    (SELECT COALESCE(SUM(total),0) FROM public.orders o WHERE o.workspace_id = w.id)
  FROM public.workspaces w
  ORDER BY w.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_workspaces() TO authenticated;
