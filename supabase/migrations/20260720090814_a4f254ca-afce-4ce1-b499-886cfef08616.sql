-- Helper: ensure user has a workspace, return its id
CREATE OR REPLACE FUNCTION public.ensure_default_workspace(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
BEGIN
  SELECT workspace_id INTO _workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF _workspace_id IS NOT NULL THEN
    RETURN _workspace_id;
  END IF;

  INSERT INTO public.workspaces (name)
  VALUES ('My Workspace')
  RETURNING id INTO _workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, _user_id, 'owner');

  RETURN _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_workspace(uuid) TO authenticated;

-- ai_employees
CREATE TABLE public.ai_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text,
  avatar_emoji text NOT NULL DEFAULT '🤖',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','training','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_employees TO authenticated;
GRANT ALL ON public.ai_employees TO service_role;

ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace AI employees"
  ON public.ai_employees FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create AI employees in their workspace"
  ON public.ai_employees FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Members can update workspace AI employees"
  ON public.ai_employees FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace AI employees"
  ON public.ai_employees FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_ai_employees_updated_at
  BEFORE UPDATE ON public.ai_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- playground_conversations
CREATE TABLE public.playground_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New chat',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_conversations TO authenticated;
GRANT ALL ON public.playground_conversations TO service_role;

ALTER TABLE public.playground_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own playground conversations"
  ON public.playground_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_playground_conversations_updated_at
  BEFORE UPDATE ON public.playground_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- playground_messages
CREATE TABLE public.playground_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.playground_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_messages TO authenticated;
GRANT ALL ON public.playground_messages TO service_role;

ALTER TABLE public.playground_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own playground messages"
  ON public.playground_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playground_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playground_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

CREATE INDEX idx_playground_messages_conv ON public.playground_messages(conversation_id, created_at);
CREATE INDEX idx_ai_employees_workspace ON public.ai_employees(workspace_id);