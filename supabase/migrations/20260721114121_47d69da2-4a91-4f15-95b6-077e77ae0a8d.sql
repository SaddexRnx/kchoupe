
-- 1) Orders: add channel
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS orders_workspace_channel_idx ON public.orders (workspace_id, channel, created_at DESC);

-- 2) Conversations: escalation flags
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS escalated_reason text;
CREATE INDEX IF NOT EXISTS inbox_conv_needs_human_idx ON public.inbox_conversations (workspace_id, needs_human) WHERE needs_human;

-- 3) Profiles: ban fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND banned_at IS NOT NULL);
$$;

-- 4) Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_user boolean NOT NULL DEFAULT false,
  unread_for_admin boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_ws_idx ON public.support_tickets (workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_admin_idx ON public.support_tickets (status, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view workspace tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members can open tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND opened_by = auth.uid());
CREATE POLICY "openers can update own; admin any" ON public.support_tickets FOR UPDATE TO authenticated
  USING (opened_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (opened_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin can delete tickets" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Support messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages (ticket_id, created_at ASC);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members and admins can read ticket messages" ON public.support_messages FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members and admins can post ticket messages" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (sender_role = 'user'  AND public.is_workspace_member(auth.uid(), workspace_id))
      OR (sender_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
    )
  );

-- 6) Trigger to update tickets on new message
CREATE OR REPLACE FUNCTION public.on_support_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
     SET last_message_at = NEW.created_at,
         updated_at = NEW.created_at,
         unread_for_user  = CASE WHEN NEW.sender_role = 'admin' THEN true  ELSE unread_for_user  END,
         unread_for_admin = CASE WHEN NEW.sender_role = 'user'  THEN true  ELSE unread_for_admin END,
         status = CASE WHEN NEW.sender_role = 'user' AND status = 'resolved' THEN 'open'
                       WHEN NEW.sender_role = 'admin' AND status = 'open' THEN 'pending'
                       ELSE status END
   WHERE id = NEW.ticket_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_support_message_insert ON public.support_messages;
CREATE TRIGGER trg_support_message_insert AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_support_message_insert();

CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Channel summary RPC
CREATE OR REPLACE FUNCTION public.channel_summary(_workspace_id uuid, _since timestamptz DEFAULT (now() - interval '30 days'))
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  WITH ch AS (
    SELECT DISTINCT channel FROM (
      SELECT channel FROM inbox_conversations WHERE workspace_id = _workspace_id
      UNION ALL SELECT channel FROM orders WHERE workspace_id = _workspace_id
    ) x
  )
  SELECT jsonb_agg(jsonb_build_object(
    'channel', ch.channel,
    'conversations', COALESCE((SELECT count(*) FROM inbox_conversations c WHERE c.workspace_id = _workspace_id AND c.channel = ch.channel AND c.updated_at >= _since), 0),
    'messages',      COALESCE((SELECT count(*) FROM inbox_messages m JOIN inbox_conversations c ON c.id = m.conversation_id WHERE m.workspace_id = _workspace_id AND c.channel = ch.channel AND m.created_at >= _since), 0),
    'orders',        COALESCE((SELECT count(*) FROM orders o WHERE o.workspace_id = _workspace_id AND o.channel = ch.channel AND o.created_at >= _since), 0),
    'revenue',       COALESCE((SELECT SUM(amount) FROM orders o WHERE o.workspace_id = _workspace_id AND o.channel = ch.channel AND o.created_at >= _since AND o.status IN ('paid','delivered')), 0),
    'needs_human',   COALESCE((SELECT count(*) FROM inbox_conversations c WHERE c.workspace_id = _workspace_id AND c.channel = ch.channel AND c.needs_human = true), 0)
  ) ORDER BY 1) INTO r FROM ch;

  RETURN jsonb_build_object(
    'channels', COALESCE(r, '[]'::jsonb),
    'needs_human_total', (SELECT count(*) FROM inbox_conversations WHERE workspace_id = _workspace_id AND needs_human = true),
    'total_conversations', (SELECT count(*) FROM inbox_conversations WHERE workspace_id = _workspace_id AND updated_at >= _since),
    'total_messages',      (SELECT count(*) FROM inbox_messages WHERE workspace_id = _workspace_id AND created_at >= _since),
    'total_orders',        (SELECT count(*) FROM orders WHERE workspace_id = _workspace_id AND created_at >= _since),
    'since', _since
  );
END $$;

-- 8) Admin ban RPC
CREATE OR REPLACE FUNCTION public.admin_set_ban(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  UPDATE public.profiles
     SET banned_at = CASE WHEN _banned THEN COALESCE(banned_at, now()) ELSE NULL END,
         ban_reason = CASE WHEN _banned THEN _reason ELSE NULL END
   WHERE id = _user_id;
END $$;

-- 9) Admin tickets feed
CREATE OR REPLACE FUNCTION public.admin_list_support_tickets()
RETURNS TABLE (
  id uuid, workspace_id uuid, workspace_name text, opened_by uuid, opener_email text, opener_name text,
  subject text, status text, priority text, last_message_at timestamptz, unread_for_admin boolean,
  message_count bigint, created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT t.id, t.workspace_id, w.name, t.opened_by, u.email::text, p.display_name,
         t.subject, t.status, t.priority, t.last_message_at, t.unread_for_admin,
         (SELECT count(*) FROM public.support_messages m WHERE m.ticket_id = t.id),
         t.created_at
    FROM public.support_tickets t
    JOIN public.workspaces w ON w.id = t.workspace_id
    JOIN auth.users u ON u.id = t.opened_by
    LEFT JOIN public.profiles p ON p.id = t.opened_by
   ORDER BY t.last_message_at DESC;
END $$;

-- 10) Realtime
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
