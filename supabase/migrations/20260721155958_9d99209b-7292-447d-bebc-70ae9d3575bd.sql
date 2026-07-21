
-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_workspace_idx ON public.audit_log(workspace_id, created_at DESC);
CREATE INDEX audit_log_actor_idx ON public.audit_log(actor_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read_workspace_members" ON public.audit_log FOR SELECT TO authenticated
  USING ((workspace_id IS NULL AND actor_id = auth.uid())
         OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "audit_insert_authenticated" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============ WORKSPACE BACKUPS ============
CREATE TABLE public.workspace_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text,
  size_bytes bigint DEFAULT 0,
  contents jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workspace_backups_ws_idx ON public.workspace_backups(workspace_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.workspace_backups TO authenticated;
GRANT ALL ON public.workspace_backups TO service_role;
ALTER TABLE public.workspace_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backups_owner_only" ON public.workspace_backups FOR ALL TO authenticated
  USING (public.is_workspace_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_owner(auth.uid(), workspace_id));

-- ============ REFERRALS ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE code text;
BEGIN
  LOOP
    code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END; $$;

UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT public.generate_referral_code();

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  reward_days integer NOT NULL DEFAULT 10,
  reward_applied boolean NOT NULL DEFAULT false,
  reward_applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referrals_referrer_idx ON public.referrals(referrer_id, created_at DESC);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_read_own" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- ============ STOREFRONT ============
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS storefront_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS storefront_tagline text;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url text;

CREATE OR REPLACE FUNCTION public.slugify(_input text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'))
$$;

UPDATE public.workspaces w
SET slug = COALESCE(NULLIF(public.slugify(w.name), ''), 'workspace') || '-' || substring(w.id::text from 1 for 6)
WHERE slug IS NULL;

CREATE OR REPLACE VIEW public.public_storefronts AS
  SELECT id, slug, name, storefront_tagline, logo_url, currency, country
  FROM public.workspaces WHERE storefront_enabled = true AND slug IS NOT NULL;
GRANT SELECT ON public.public_storefronts TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_storefront_products AS
  SELECT p.id, p.workspace_id, w.slug AS workspace_slug, p.name, p.description, p.price, p.currency,
         p.image_emoji, p.sku, p.stock, p.status, p.category, p.created_at
  FROM public.products p
  JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE w.storefront_enabled = true AND p.status = 'active';
GRANT SELECT ON public.public_storefront_products TO anon, authenticated;

CREATE POLICY "products_public_storefront_read" ON public.products FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.storefront_enabled = true));
CREATE POLICY "workspaces_public_storefront_read" ON public.workspaces FOR SELECT TO anon
  USING (storefront_enabled = true AND slug IS NOT NULL);

-- ============ AI EMPLOYEE TEMPLATES ============
CREATE TABLE public.ai_employee_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  suggested_model text,
  avatar_emoji text DEFAULT '🤖',
  tone text DEFAULT 'friendly',
  featured boolean NOT NULL DEFAULT false,
  install_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_employee_templates TO anon, authenticated;
GRANT ALL ON public.ai_employee_templates TO service_role;
ALTER TABLE public.ai_employee_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_public_read" ON public.ai_employee_templates FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.ai_employee_templates (slug, title, category, description, system_prompt, suggested_model, avatar_emoji, featured) VALUES
  ('beauty-nova', 'Beauty Advisor Nova', 'Beauty', 'Warm, on-trend beauty consultant. Recommends products by skin type & concern.', 'You are Nova, a warm beauty advisor. Ask about skin type, tone, and concerns. Suggest 1-2 catalog products with quick reasons. Never invent products.', 'google/gemini-2.5-flash', '💄', true),
  ('fashion-aurora', 'Fashion Stylist Aurora', 'Fashion', 'Personal stylist for outfits, sizing, and returns.', 'You are Aurora, a friendly fashion stylist. Ask about occasion, size, style preference. Suggest matching items from catalog. Keep replies short.', 'google/gemini-2.5-flash', '👗', true),
  ('electronics-atlas', 'Electronics Expert Atlas', 'Electronics', 'Technical spec whisperer for gadgets & accessories.', 'You are Atlas, a knowledgeable electronics expert. Ask about use case and budget. Compare specs briefly and suggest catalog items.', 'google/gemini-2.5-flash', '📱', true),
  ('food-ember', 'Food & Grocery Ember', 'Food', 'Local grocery assistant, upsells combos and family packs.', 'You are Ember, a friendly grocery helper. Suggest fresh combos, remind about family packs, confirm delivery address.', 'google/gemini-2.5-flash', '🥗', false),
  ('support-sage', 'Customer Support Sage', 'Support', 'Handles returns, tracking, and complaints with empathy.', 'You are Sage, a calm support agent. Apologize when needed, ask for order number, resolve or escalate to a human.', 'google/gemini-2.5-flash', '🛟', true);

-- ============ 2FA ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_backup_codes text[];

-- ============ PRESENCE ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE OR REPLACE FUNCTION public.touch_presence() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- ============ HUMAN HANDOFF ============
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS human_taken_over boolean NOT NULL DEFAULT false;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS human_taken_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============ GDPR ============
CREATE TABLE public.gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('export','delete')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','done','failed')),
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT ON public.gdpr_requests TO authenticated;
GRANT ALL ON public.gdpr_requests TO service_role;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gdpr_own_only" ON public.gdpr_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ REFERRAL TRIGGER ============
CREATE OR REPLACE FUNCTION public.apply_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code text := NEW.raw_user_meta_data->>'referral_code';
  _ref uuid;
BEGIN
  IF _code IS NULL OR length(_code) = 0 THEN RETURN NEW; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = lower(_code) LIMIT 1;
  IF _ref IS NULL OR _ref = NEW.id THEN RETURN NEW; END IF;
  UPDATE public.profiles SET referred_by = _ref WHERE id = NEW.id;
  INSERT INTO public.referrals (referrer_id, referred_id, code_used) VALUES (_ref, NEW.id, lower(_code))
    ON CONFLICT (referred_id) DO NOTHING;
  UPDATE public.workspaces
    SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + interval '10 days'
    WHERE owner_id = _ref AND plan = 'trial';
  UPDATE public.referrals SET reward_applied = true, reward_applied_at = now()
    WHERE referred_id = NEW.id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral();

-- ============ REALTIME ============
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
