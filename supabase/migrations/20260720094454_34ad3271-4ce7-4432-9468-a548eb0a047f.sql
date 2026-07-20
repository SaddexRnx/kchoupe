
-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  stock integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','out')),
  image_emoji text NOT NULL DEFAULT '📦',
  sold_30 integer NOT NULL DEFAULT 0,
  ai_sold integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products members read" ON public.products FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "products members write" ON public.products FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX products_workspace_idx ON public.products(workspace_id, created_at DESC);

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text,
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers members read" ON public.customers FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "customers members write" ON public.customers FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX customers_workspace_idx ON public.customers(workspace_id, created_at DESC);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  product_summary text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','refunded','cancelled')),
  confirmed_by_ai boolean NOT NULL DEFAULT false,
  ai_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, order_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders members read" ON public.orders FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "orders members write" ON public.orders FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_workspace_idx ON public.orders(workspace_id, created_at DESC);

-- Inbox conversations
CREATE TABLE public.inbox_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'web',
  external_user text NOT NULL,
  ai_employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  ai_employee_name text,
  last_message text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','risk','resolved')),
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_conversations TO authenticated;
GRANT ALL ON public.inbox_conversations TO service_role;
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_conv members read" ON public.inbox_conversations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "inbox_conv members write" ON public.inbox_conversations FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_inbox_conv_updated BEFORE UPDATE ON public.inbox_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX inbox_conv_workspace_idx ON public.inbox_conversations(workspace_id, updated_at DESC);

-- Inbox messages
CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','agent','system')),
  sender text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_messages TO authenticated;
GRANT ALL ON public.inbox_messages TO service_role;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_msg members read" ON public.inbox_messages FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "inbox_msg members write" ON public.inbox_messages FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX inbox_msg_convo_idx ON public.inbox_messages(conversation_id, created_at ASC);
