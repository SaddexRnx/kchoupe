
ALTER VIEW public.public_storefronts SET (security_invoker = on);
ALTER VIEW public.public_storefront_products SET (security_invoker = on);

CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE code text;
BEGIN
  LOOP
    code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.slugify(_input text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'))
$$;
