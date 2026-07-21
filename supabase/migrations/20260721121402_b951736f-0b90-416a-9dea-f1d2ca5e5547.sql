
-- 1 & 2: Lock down SECURITY DEFINER app functions.
-- Revoke EXECUTE from PUBLIC/anon on all app-owned SECURITY DEFINER functions;
-- keep authenticated where the function is used from signed-in code
-- (each function still enforces has_role / is_workspace_member internally).
-- Admin-only functions are further locked to service_role + authenticated
-- (their bodies reject non-admins with 'not authorized').

REVOKE EXECUTE ON FUNCTION public.conversation_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.channel_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.channel_summary(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(uuid, vector, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_default_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;

-- Admin-only helpers: strip anon entirely; authenticated stays (self-guarded).
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_workspaces() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_timeseries() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_support_tickets() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_ban(uuid, boolean, text) FROM PUBLIC, anon;

-- Trigger-only functions: no direct callers need EXECUTE.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_support_message_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3: knowledge-files bucket UPDATE policy scoped to workspace members.
CREATE POLICY "members update knowledge files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(objects.name))[1]
  )
);

-- 4: harden user_roles — make it structurally impossible for a non-admin
-- to insert an admin row for themselves, even if a future policy widens INSERT.
-- Only admins may set role = 'admin'; anyone else attempting it is rejected.
CREATE OR REPLACE FUNCTION public.prevent_self_admin_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::public.app_role
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'only admins can grant the admin role';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_self_admin_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_self_admin_grant ON public.user_roles;
CREATE TRIGGER trg_prevent_self_admin_grant
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_admin_grant();
