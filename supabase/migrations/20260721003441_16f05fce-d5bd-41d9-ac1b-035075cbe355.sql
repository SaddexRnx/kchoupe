
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS public.custom_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  base_url text NOT NULL,
  model_id text NOT NULL,
  api_key text NOT NULL,
  last_test_status text,
  last_test_message text,
  last_test_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_models TO authenticated;
GRANT ALL ON public.custom_models TO service_role;

ALTER TABLE public.custom_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm members read" ON public.custom_models FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "cm members insert" ON public.custom_models FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "cm members update" ON public.custom_models FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "cm members delete" ON public.custom_models FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "cm admins" ON public.custom_models FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_custom_models_updated BEFORE UPDATE ON public.custom_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS custom_models_workspace_idx ON public.custom_models(workspace_id);
