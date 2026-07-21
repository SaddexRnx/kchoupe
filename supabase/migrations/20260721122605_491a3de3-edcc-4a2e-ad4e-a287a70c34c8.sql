
-- 1) Helper: is workspace owner/admin (row-level, based on membership role or workspaces.owner_id)
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role IN ('owner','admin')
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id AND w.owner_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) TO authenticated;

-- 2) custom_models: restrict SELECT (which exposes api_key) to workspace owners/admins
DROP POLICY IF EXISTS "cm members read" ON public.custom_models;
CREATE POLICY "cm owners read"
  ON public.custom_models FOR SELECT
  USING (public.is_workspace_owner(auth.uid(), workspace_id));

-- Also restrict destructive/mutating access to owners (was: any member)
DROP POLICY IF EXISTS "cm members insert" ON public.custom_models;
DROP POLICY IF EXISTS "cm members update" ON public.custom_models;
DROP POLICY IF EXISTS "cm members delete" ON public.custom_models;

CREATE POLICY "cm owners insert"
  ON public.custom_models FOR INSERT
  WITH CHECK (public.is_workspace_owner(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "cm owners update"
  ON public.custom_models FOR UPDATE
  USING (public.is_workspace_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_owner(auth.uid(), workspace_id));

CREATE POLICY "cm owners delete"
  ON public.custom_models FOR DELETE
  USING (public.is_workspace_owner(auth.uid(), workspace_id));

-- 3) integrations: restrict SELECT (which exposes credentials) to workspace owners/admins
DROP POLICY IF EXISTS "Workspace members read integrations" ON public.integrations;
CREATE POLICY "Workspace owners read integrations"
  ON public.integrations FOR SELECT
  USING (public.is_workspace_owner(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace members insert integrations" ON public.integrations;
DROP POLICY IF EXISTS "Workspace members update integrations" ON public.integrations;
DROP POLICY IF EXISTS "Workspace members delete integrations" ON public.integrations;

CREATE POLICY "Workspace owners insert integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (public.is_workspace_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace owners update integrations"
  ON public.integrations FOR UPDATE
  USING (public.is_workspace_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace owners delete integrations"
  ON public.integrations FOR DELETE
  USING (public.is_workspace_owner(auth.uid(), workspace_id));

-- 4) workspace_members: constrain allowed roles and prevent silent identity/role manipulation
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner','admin','member'));

CREATE OR REPLACE FUNCTION public.workspace_members_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Immutable identity fields
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'cannot change user_id of a workspace membership';
    END IF;
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'cannot change workspace_id of a workspace membership';
    END IF;
    -- Only the workspace primary owner or a platform admin may grant/revoke 'owner'/'admin'
    IF (NEW.role IN ('owner','admin') OR OLD.role IN ('owner','admin'))
       AND NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND w.owner_id = auth.uid())
      ) THEN
        RAISE EXCEPTION 'only the workspace primary owner or a platform admin can change owner/admin membership roles';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Only the workspace primary owner or a platform admin may seed owner/admin members (other than self via ensure_default_workspace, which runs as definer and bypasses this trigger's scope check when auth.uid() is the same as NEW.user_id creating their first workspace)
    IF NEW.role IN ('owner','admin') AND NEW.user_id <> auth.uid() THEN
      IF NOT (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND w.owner_id = auth.uid())
      ) THEN
        RAISE EXCEPTION 'only the workspace primary owner or a platform admin can add owner/admin members';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.workspace_members_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_workspace_members_guard ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_guard
  BEFORE INSERT OR UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.workspace_members_guard();
