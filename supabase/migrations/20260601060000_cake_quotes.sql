-- Cake Studio: custom cake quotes with a request -> quoted -> placed-order lifecycle

CREATE TABLE IF NOT EXISTS public.cake_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL DEFAULT '',
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspiration_images text[] NOT NULL DEFAULT '{}',
  ai_image_url text NOT NULL DEFAULT '',
  event_date date,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','quoted','accepted','declined','expired')),
  quoted_price numeric,
  quote_message text NOT NULL DEFAULT '',
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  quoted_at timestamptz,
  accepted_at timestamptz
);

ALTER TABLE public.cake_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cake_quotes_admin_all ON public.cake_quotes;
CREATE POLICY cake_quotes_admin_all ON public.cake_quotes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS cake_quotes_own_read ON public.cake_quotes;
CREATE POLICY cake_quotes_own_read ON public.cake_quotes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Public storage bucket for inspiration moodboard uploads (guests allowed)
INSERT INTO storage.buckets (id,name,public) VALUES ('cake-inspiration','cake-inspiration',true)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "cake inspiration read" ON storage.objects;
CREATE POLICY "cake inspiration read" ON storage.objects FOR SELECT TO public USING (bucket_id='cake-inspiration');
DROP POLICY IF EXISTS "cake inspiration insert" ON storage.objects;
CREATE POLICY "cake inspiration insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id='cake-inspiration');
DROP POLICY IF EXISTS "cake inspiration delete" ON storage.objects;
CREATE POLICY "cake inspiration delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='cake-inspiration' AND public.is_admin());

-- Submit a quote request (guest-safe). Generates a unique tracking code.
CREATE OR REPLACE FUNCTION public.submit_cake_quote(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE code text; qid uuid;
BEGIN
  IF length(trim(coalesce(p_payload->>'customer_name','')))=0 OR length(trim(coalesce(p_payload->>'customer_phone','')))=0 THEN
    RAISE EXCEPTION 'Name and phone are required';
  END IF;
  LOOP
    code := 'CK-'||upper(substr(md5(gen_random_uuid()::text),1,6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cake_quotes WHERE tracking_code=code);
  END LOOP;
  INSERT INTO public.cake_quotes(tracking_code,user_id,customer_name,customer_phone,customer_email,brief,inspiration_images,ai_image_url,event_date)
  VALUES(code,auth.uid(),trim(p_payload->>'customer_name'),trim(p_payload->>'customer_phone'),coalesce(p_payload->>'customer_email',''),
    coalesce(p_payload->'brief','{}'::jsonb),
    coalesce((SELECT array_agg(value::text) FROM jsonb_array_elements_text(coalesce(p_payload->'inspiration_images','[]'::jsonb))),'{}'),
    coalesce(p_payload->>'ai_image_url',''),
    NULLIF(p_payload->>'event_date','')::date)
  RETURNING id INTO qid;
  RETURN jsonb_build_object('tracking_code',code,'id',qid);
END $$;
GRANT EXECUTE ON FUNCTION public.submit_cake_quote(jsonb) TO anon, authenticated;

-- Public tracking by code (guest-safe)
CREATE OR REPLACE FUNCTION public.track_cake(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row public.cake_quotes;
BEGIN
  SELECT * INTO row FROM public.cake_quotes WHERE tracking_code=upper(trim(p_code));
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('tracking_code',row.tracking_code,'customer_name',row.customer_name,'status',row.status,
    'brief',row.brief,'inspiration_images',row.inspiration_images,'ai_image_url',row.ai_image_url,'event_date',row.event_date,
    'quoted_price',row.quoted_price,'quote_message',row.quote_message,'order_id',row.order_id,
    'created_at',row.created_at,'quoted_at',row.quoted_at,'accepted_at',row.accepted_at);
END $$;
GRANT EXECUTE ON FUNCTION public.track_cake(text) TO anon, authenticated;

-- Admin: set a price + message (status -> quoted)
CREATE OR REPLACE FUNCTION public.admin_quote_cake(p_id uuid, p_price numeric, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_price IS NULL OR p_price<=0 THEN RAISE EXCEPTION 'Enter a valid price'; END IF;
  UPDATE public.cake_quotes SET status='quoted',quoted_price=round(p_price,2),quote_message=coalesce(p_message,''),quoted_at=now()
   WHERE id=p_id AND status IN ('requested','quoted');
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found or already placed'; END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_quote_cake(uuid,numeric,text) TO authenticated;

-- Customer/guest accepts a quote -> creates a real order (guest-safe via tracking code)
CREATE OR REPLACE FUNCTION public.accept_cake_quote(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q public.cake_quotes; oid text; tz text; dtype text; occ text;
BEGIN
  SELECT * INTO q FROM public.cake_quotes WHERE tracking_code=upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cake tracking number not found'; END IF;
  IF q.status='accepted' AND q.order_id IS NOT NULL THEN RETURN jsonb_build_object('order_id',q.order_id,'already',true); END IF;
  IF q.status<>'quoted' THEN RAISE EXCEPTION 'This quote is not ready to place yet'; END IF;
  SELECT timezone INTO tz FROM public.bakery_settings WHERE id;
  dtype := CASE WHEN q.brief->'occasion'->>'deliveryType'='delivery' THEN 'delivery' ELSE 'pickup' END;
  occ := coalesce(q.brief->'occasion'->>'occasion','Custom');
  oid := 'LB-'||upper(replace(gen_random_uuid()::text,'-',''));
  INSERT INTO public.orders(id,user_id,customer_name,customer_phone,customer_address,delivery_type,payment_method,
    subtotal,delivery_fee,tax,total,status,notes,fulfillment_date,fulfillment_timezone,inventory_reserved)
  VALUES(oid,q.user_id,q.customer_name,q.customer_phone,CASE WHEN dtype='delivery' THEN 'Custom cake delivery' ELSE 'Pickup' END,
    dtype::public.delivery_type,'cash'::public.payment_method,
    q.quoted_price,0,0,q.quoted_price,'pending',
    'Custom Cake · Tracking '||q.tracking_code||coalesce(' · '||(q.brief->'occasion'->>'milestone'),''),
    q.event_date,coalesce(tz,'America/New_York'),false);
  INSERT INTO public.order_items(order_id,item_id,name,qty,price,is_box)
  VALUES(oid,NULL,'🎂 Custom Cake — '||occ||' ('||q.tracking_code||')',1,q.quoted_price,false);
  UPDATE public.cake_quotes SET status='accepted',order_id=oid,accepted_at=now() WHERE id=q.id;
  RETURN jsonb_build_object('order_id',oid);
END $$;
GRANT EXECUTE ON FUNCTION public.accept_cake_quote(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.decline_cake_quote(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.cake_quotes SET status='declined' WHERE tracking_code=upper(trim(p_code)) AND status IN ('requested','quoted');
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.decline_cake_quote(text) TO anon, authenticated;

NOTIFY pgrst,'reload schema';
