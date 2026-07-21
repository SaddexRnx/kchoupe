
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS escalated_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE OR REPLACE FUNCTION public.admin_set_ban(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  UPDATE public.profiles
    SET banned_at = CASE WHEN _banned THEN now() ELSE NULL END,
        ban_reason = CASE WHEN _banned THEN _reason ELSE NULL END
    WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.channel_summary(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  WITH channels(ch) AS (VALUES ('telegram'),('facebook'),('instagram'),('whatsapp'),('web')),
  conv AS (
    SELECT COALESCE(channel,'web') ch, count(*) c, COALESCE(SUM(unread_count),0) unread,
      COUNT(*) FILTER (WHERE needs_human) escalations
    FROM public.inbox_conversations WHERE workspace_id = _workspace_id GROUP BY 1
  ),
  msg AS (
    SELECT COALESCE(c.channel,'web') ch, count(m.*) c
    FROM public.inbox_messages m
    LEFT JOIN public.inbox_conversations c ON c.id = m.conversation_id
    WHERE m.workspace_id = _workspace_id GROUP BY 1
  ),
  ord AS (
    SELECT COALESCE(channel,'web') ch, count(*) c, COALESCE(SUM(amount),0) rev
    FROM public.orders WHERE workspace_id = _workspace_id GROUP BY 1
  )
  SELECT jsonb_build_object(
    'channels', COALESCE(jsonb_agg(jsonb_build_object(
      'channel', channels.ch,
      'conversations', COALESCE(conv.c,0),
      'unread', COALESCE(conv.unread,0),
      'escalations', COALESCE(conv.escalations,0),
      'messages', COALESCE(msg.c,0),
      'orders', COALESCE(ord.c,0),
      'revenue', COALESCE(ord.rev,0)
    ) ORDER BY channels.ch), '[]'::jsonb),
    'escalations', (SELECT count(*) FROM public.inbox_conversations WHERE workspace_id = _workspace_id AND needs_human)
  ) INTO result
  FROM channels
  LEFT JOIN conv ON conv.ch = channels.ch
  LEFT JOIN msg ON msg.ch = channels.ch
  LEFT JOIN ord ON ord.ch = channels.ch;
  RETURN result;
END; $$;

ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
