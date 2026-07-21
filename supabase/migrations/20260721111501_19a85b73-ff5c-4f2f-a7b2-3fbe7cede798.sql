CREATE TABLE public.workspace_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.inbox_conversations(id) ON DELETE SET NULL,
  lesson TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'order_confirmed',
  score INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ws_learnings_workspace ON public.workspace_learnings(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_learnings TO authenticated;
GRANT ALL ON public.workspace_learnings TO service_role;
ALTER TABLE public.workspace_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read learnings" ON public.workspace_learnings FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write learnings" ON public.workspace_learnings FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.conversation_stats(_workspace_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'conversations', (SELECT count(*) FROM inbox_conversations WHERE workspace_id = _workspace_id),
    'messages', (SELECT count(*) FROM inbox_messages WHERE workspace_id = _workspace_id),
    'user_messages', (SELECT count(*) FROM inbox_messages WHERE workspace_id = _workspace_id AND role = 'user'),
    'agent_messages', (SELECT count(*) FROM inbox_messages WHERE workspace_id = _workspace_id AND role = 'agent'),
    'confirmed_orders', (SELECT count(*) FROM orders WHERE workspace_id = _workspace_id AND confirmed_by_ai = true),
    'total_orders', (SELECT count(*) FROM orders WHERE workspace_id = _workspace_id),
    'customers', (SELECT count(*) FROM customers WHERE workspace_id = _workspace_id),
    'returning_customers', (SELECT count(*) FROM customers WHERE workspace_id = _workspace_id AND COALESCE(message_count,0) > 1),
    'by_channel', (SELECT COALESCE(jsonb_object_agg(channel, c), '{}'::jsonb) FROM (SELECT channel, count(*) c FROM inbox_conversations WHERE workspace_id = _workspace_id GROUP BY channel) s),
    'top_customers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(display_name,name,external_id), 'channel', channel, 'messages', message_count) ORDER BY message_count DESC), '[]'::jsonb)
      FROM (SELECT display_name, name, external_id, channel, message_count FROM customers WHERE workspace_id = _workspace_id ORDER BY COALESCE(message_count,0) DESC LIMIT 5) x
    ),
    'learnings', (SELECT count(*) FROM workspace_learnings WHERE workspace_id = _workspace_id)
  ) INTO r;
  RETURN r;
END; $$;