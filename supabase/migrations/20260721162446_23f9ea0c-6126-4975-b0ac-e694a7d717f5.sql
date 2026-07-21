
-- ============ WILAYAS REFERENCE ============
CREATE TABLE public.wilayas (
  code int PRIMARY KEY,
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL
);
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT ALL ON public.wilayas TO service_role;
ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wilayas readable by all" ON public.wilayas FOR SELECT USING (true);

INSERT INTO public.wilayas (code, name_fr, name_ar, name_en) VALUES
(1,'Adrar','أدرار','Adrar'),(2,'Chlef','الشلف','Chlef'),(3,'Laghouat','الأغواط','Laghouat'),
(4,'Oum El Bouaghi','أم البواقي','Oum El Bouaghi'),(5,'Batna','باتنة','Batna'),(6,'Béjaïa','بجاية','Bejaia'),
(7,'Biskra','بسكرة','Biskra'),(8,'Béchar','بشار','Bechar'),(9,'Blida','البليدة','Blida'),
(10,'Bouira','البويرة','Bouira'),(11,'Tamanrasset','تمنراست','Tamanrasset'),(12,'Tébessa','تبسة','Tebessa'),
(13,'Tlemcen','تلمسان','Tlemcen'),(14,'Tiaret','تيارت','Tiaret'),(15,'Tizi Ouzou','تيزي وزو','Tizi Ouzou'),
(16,'Alger','الجزائر','Algiers'),(17,'Djelfa','الجلفة','Djelfa'),(18,'Jijel','جيجل','Jijel'),
(19,'Sétif','سطيف','Setif'),(20,'Saïda','سعيدة','Saida'),(21,'Skikda','سكيكدة','Skikda'),
(22,'Sidi Bel Abbès','سيدي بلعباس','Sidi Bel Abbes'),(23,'Annaba','عنابة','Annaba'),(24,'Guelma','قالمة','Guelma'),
(25,'Constantine','قسنطينة','Constantine'),(26,'Médéa','المدية','Medea'),(27,'Mostaganem','مستغانم','Mostaganem'),
(28,'M''Sila','المسيلة','MSila'),(29,'Mascara','معسكر','Mascara'),(30,'Ouargla','ورقلة','Ouargla'),
(31,'Oran','وهران','Oran'),(32,'El Bayadh','البيض','El Bayadh'),(33,'Illizi','إليزي','Illizi'),
(34,'Bordj Bou Arreridj','برج بوعريريج','Bordj Bou Arreridj'),(35,'Boumerdès','بومرداس','Boumerdes'),
(36,'El Tarf','الطارف','El Tarf'),(37,'Tindouf','تندوف','Tindouf'),(38,'Tissemsilt','تيسمسيلت','Tissemsilt'),
(39,'El Oued','الوادي','El Oued'),(40,'Khenchela','خنشلة','Khenchela'),(41,'Souk Ahras','سوق أهراس','Souk Ahras'),
(42,'Tipaza','تيبازة','Tipaza'),(43,'Mila','ميلة','Mila'),(44,'Aïn Defla','عين الدفلى','Ain Defla'),
(45,'Naâma','النعامة','Naama'),(46,'Aïn Témouchent','عين تموشنت','Ain Temouchent'),(47,'Ghardaïa','غرداية','Ghardaia'),
(48,'Relizane','غليزان','Relizane'),(49,'Timimoun','تيميمون','Timimoun'),(50,'Bordj Badji Mokhtar','برج باجي مختار','Bordj Badji Mokhtar'),
(51,'Ouled Djellal','أولاد جلال','Ouled Djellal'),(52,'Béni Abbès','بني عباس','Beni Abbes'),(53,'In Salah','عين صالح','In Salah'),
(54,'In Guezzam','عين قزام','In Guezzam'),(55,'Touggourt','تقرت','Touggourt'),(56,'Djanet','جانت','Djanet'),
(57,'El M''Ghair','المغير','El MGhair'),(58,'El Meniaa','المنيعة','El Meniaa');

-- ============ CARRIERS ============
CREATE TABLE public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual','api')),
  provider text,
  api_key text,
  api_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  tracking_url_template text,
  default_fee numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carriers TO authenticated;
GRANT ALL ON public.carriers TO service_role;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read carriers" ON public.carriers FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write carriers" ON public.carriers FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update carriers" ON public.carriers FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members delete carriers" ON public.carriers FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_carriers_updated BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_carriers_ws ON public.carriers(workspace_id);

-- ============ SHIPPING ZONES ============
CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  wilaya_code int NOT NULL REFERENCES public.wilayas(code),
  home_fee numeric NOT NULL DEFAULT 0,
  desk_fee numeric,
  free_shipping_threshold numeric,
  estimated_days int,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, wilaya_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read zones" ON public.shipping_zones FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write zones" ON public.shipping_zones FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update zones" ON public.shipping_zones FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members delete zones" ON public.shipping_zones FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_zones_updated BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_zones_ws ON public.shipping_zones(workspace_id);

-- ============ EXTEND ORDERS ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_amount numeric,
  ADD COLUMN IF NOT EXISTS wilaya_code int REFERENCES public.wilayas(code),
  ADD COLUMN IF NOT EXISTS commune text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'home' CHECK (delivery_type IN ('home','desk','pickup')),
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- ============ DELIVERY STATUS HISTORY ============
CREATE TABLE public.delivery_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_status_history TO authenticated;
GRANT ALL ON public.delivery_status_history TO service_role;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read history" ON public.delivery_status_history FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members write history" ON public.delivery_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_dsh_order ON public.delivery_status_history(order_id, created_at DESC);

-- ============ FEE CALCULATOR ============
CREATE OR REPLACE FUNCTION public.calculate_shipping_fee(_workspace_id uuid, _wilaya_code int, _order_value numeric, _delivery_type text DEFAULT 'home')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _zone record; _fee numeric := 0; _free boolean := false; _threshold numeric;
BEGIN
  SELECT * INTO _zone FROM public.shipping_zones
    WHERE workspace_id = _workspace_id AND wilaya_code = _wilaya_code AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'fee', 0, 'free_shipping_applied', false);
  END IF;
  _fee := CASE WHEN _delivery_type = 'desk' AND _zone.desk_fee IS NOT NULL THEN _zone.desk_fee ELSE _zone.home_fee END;
  _threshold := _zone.free_shipping_threshold;
  IF _threshold IS NOT NULL AND _order_value >= _threshold THEN
    _fee := 0; _free := true;
  END IF;
  RETURN jsonb_build_object(
    'found', true, 'fee', _fee, 'free_shipping_applied', _free,
    'threshold', _threshold, 'estimated_days', _zone.estimated_days,
    'wilaya_code', _wilaya_code
  );
END $$;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_fee(uuid, int, numeric, text) TO authenticated, anon, service_role;

-- ============ SHIPMENT ASSIGNMENT (logs history) ============
CREATE OR REPLACE FUNCTION public.assign_shipment(_order_id uuid, _carrier_id uuid, _tracking text, _status text)
RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o public.orders;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF NOT public.is_workspace_member(auth.uid(), _o.workspace_id) THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.orders SET
    carrier_id = COALESCE(_carrier_id, carrier_id),
    tracking_number = COALESCE(_tracking, tracking_number),
    shipping_status = COALESCE(_status, shipping_status),
    shipped_at = CASE WHEN _status IN ('shipped','out_for_delivery','delivered') AND shipped_at IS NULL THEN now() ELSE shipped_at END,
    delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END
    WHERE id = _order_id RETURNING * INTO _o;

  INSERT INTO public.delivery_status_history(order_id, workspace_id, status, note, created_by)
    VALUES (_order_id, _o.workspace_id, COALESCE(_status, _o.shipping_status), _tracking, auth.uid());
  RETURN _o;
END $$;
GRANT EXECUTE ON FUNCTION public.assign_shipment(uuid, uuid, text, text) TO authenticated;
