
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS customers_ws_channel_extid_uidx
  ON public.customers(workspace_id, channel, external_id)
  WHERE channel IS NOT NULL AND external_id IS NOT NULL;

ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_thread_id text;

CREATE INDEX IF NOT EXISTS inbox_conv_customer_idx ON public.inbox_conversations(customer_id);
