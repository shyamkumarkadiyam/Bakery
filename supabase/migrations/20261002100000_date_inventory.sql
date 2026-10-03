-- Date-based inventory. Run once, in a transaction, after existing migrations.
-- Each date resolves to its override or the item's default; no midnight reset
-- job can accidentally wipe existing reservations or a future manual override.
CREATE TABLE public.bakery_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  timezone text NOT NULL
);
INSERT INTO public.bakery_settings (timezone) VALUES ('America/New_York');
ALTER TABLE public.bakery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read ON public.bakery_settings FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.bakery_settings TO anon, authenticated;

ALTER TABLE public.menu_items
  ADD COLUMN default_daily_quantity integer NOT NULL DEFAULT 5 CHECK (default_daily_quantity BETWEEN 0 AND 100000),
  ADD COLUMN max_qty_per_order integer NOT NULL DEFAULT 10 CHECK (max_qty_per_order BETWEEN 1 AND 100000),
  ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0);
UPDATE public.menu_items m SET max_qty_per_order = s.max_qty_per_order,
  low_stock_threshold = s.low_stock_threshold FROM public.menu_stock s WHERE s.item_id = m.id;

-- Keep legacy stock rows referentially safe, but no application view reads their
-- old counters. The menu is the master list and all stock is date-derived.
DELETE FROM public.menu_stock s WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id=s.item_id);
ALTER TABLE public.menu_stock ADD CONSTRAINT menu_stock_menu_fk
  FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;
ALTER TABLE public.availability_rules ALTER COLUMN daily_limit DROP NOT NULL,
  ALTER COLUMN daily_limit DROP DEFAULT,
  ADD CONSTRAINT inventory_limit_nonnegative CHECK (daily_limit BETWEEN 0 AND 100000),
  ADD CONSTRAINT inventory_reserved_nonnegative CHECK (orders_taken >= 0);

-- Preserve legacy unavailable items as TODAY-only overrides, not global flags.
INSERT INTO public.availability_rules(item_id,rule_date,is_blocked)
SELECT id,(now() AT TIME ZONE (SELECT timezone FROM public.bakery_settings))::date,true
FROM public.menu_items WHERE NOT available
ON CONFLICT(item_id,rule_date) DO UPDATE SET is_blocked=true;

ALTER TABLE public.orders
  ADD COLUMN fulfillment_date date,
  ADD COLUMN fulfillment_time time,
  ADD COLUMN scheduled_for timestamptz,
  ADD COLUMN fulfillment_timezone text,
  ADD COLUMN inventory_reserved boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN item_id text REFERENCES public.menu_items(id) ON DELETE SET NULL;
CREATE INDEX orders_fulfillment_date_idx ON public.orders(fulfillment_date);
CREATE INDEX order_items_menu_id_idx ON public.order_items(item_id);

-- Private retry receipts: no public reads of idempotency tokens or payloads.
CREATE TABLE public.inventory_checkout_requests (
  request_id uuid PRIMARY KEY,
  fingerprint text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_checkout_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.menu_availability(p_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tz text; today date; target date; closed boolean; reason text; entries jsonb;
BEGIN
  SELECT timezone INTO STRICT tz FROM public.bakery_settings WHERE id;
  today := (now() AT TIME ZONE tz)::date;
  target := coalesce(p_date,today);
  SELECT b.reason INTO reason FROM public.blocked_dates b WHERE blocked_date=target;
  closed := FOUND;
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.category,a.name),'[]'::jsonb) INTO entries
  FROM (
    SELECT m.id,m.name,m.category,m.price,m.description,m.image,m.alt,m.popular,m.badges,m.calories,
      m.default_daily_quantity,m.max_qty_per_order,m.low_stock_threshold,
      coalesce(r.daily_limit,m.default_daily_quantity) AS daily_limit,
      coalesce(r.orders_taken,0) AS orders_taken,
      r.daily_limit IS NOT NULL AS has_override,
      coalesce(r.is_blocked,false) AS is_blocked,
      coalesce(r.notes,'') AS notes,
      CASE WHEN closed OR coalesce(r.is_blocked,false) THEN 0
        ELSE greatest(0,coalesce(r.daily_limit,m.default_daily_quantity)-coalesce(r.orders_taken,0)) END AS remaining,
      NOT closed AND NOT coalesce(r.is_blocked,false)
        AND coalesce(r.daily_limit,m.default_daily_quantity)>coalesce(r.orders_taken,0) AS available
    FROM public.menu_items m LEFT JOIN public.availability_rules r ON r.item_id=m.id AND r.rule_date=target
  ) a;
  RETURN jsonb_build_object('date',target,'today',today,'timezone',tz,'blocked',closed,'reason',reason,'items',entries);
END $$;
REVOKE ALL ON FUNCTION public.menu_availability(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.menu_availability(date) TO anon,authenticated;

-- All stock/calendar writes and checkouts for one date share this lock. Menu
-- rows are then locked in sorted ID order, including when multiple items sell.
CREATE OR REPLACE FUNCTION public.set_item_inventory(p_item_id text,p_date date,p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.menu_items; r public.availability_rules; amount integer;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_date IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Date and changes are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory-date:'||p_date::text,0));
  SELECT * INTO m FROM public.menu_items WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Menu item no longer exists'; END IF;
  IF p_changes ? 'default_daily_quantity' THEN
    amount := (p_changes->>'default_daily_quantity')::integer;
    IF amount IS NULL OR amount<0 OR amount>100000 THEN RAISE EXCEPTION 'Default quantity must be between 0 and 100000'; END IF;
    UPDATE public.menu_items SET default_daily_quantity=amount,updated_at=now() WHERE id=p_item_id RETURNING * INTO m;
  END IF;
  IF p_changes ? 'max_qty_per_order' THEN
    UPDATE public.menu_items SET max_qty_per_order=(p_changes->>'max_qty_per_order')::integer,updated_at=now() WHERE id=p_item_id;
  END IF;
  IF p_changes ? 'low_stock_threshold' THEN
    UPDATE public.menu_items SET low_stock_threshold=(p_changes->>'low_stock_threshold')::integer,updated_at=now() WHERE id=p_item_id;
  END IF;
  INSERT INTO public.availability_rules(item_id,rule_date) VALUES(p_item_id,p_date) ON CONFLICT(item_id,rule_date) DO NOTHING;
  SELECT * INTO r FROM public.availability_rules WHERE item_id=p_item_id AND rule_date=p_date FOR UPDATE;
  IF p_changes ? 'daily_limit' THEN
    r.daily_limit := (p_changes->>'daily_limit')::integer;
    IF r.daily_limit<0 OR r.daily_limit>100000 THEN RAISE EXCEPTION 'Daily quota must be between 0 and 100000'; END IF;
    r.is_blocked := false;
  END IF;
  IF coalesce((p_changes->>'reset')::boolean,false) THEN r.daily_limit:=NULL; r.is_blocked:=false; END IF;
  IF p_changes ? 'available' THEN
    IF (p_changes->>'available')::boolean THEN
      IF EXISTS(SELECT 1 FROM public.blocked_dates WHERE blocked_date=p_date) THEN RAISE EXCEPTION 'Unblock this date before making items available'; END IF;
      r.is_blocked:=false;
      IF coalesce(r.daily_limit,m.default_daily_quantity)<=r.orders_taken THEN
        IF m.default_daily_quantity=0 THEN RAISE EXCEPTION 'Set a positive default quantity or date quota before making this item available'; END IF;
        r.daily_limit:=r.orders_taken+m.default_daily_quantity;
      END IF;
    ELSE r.is_blocked:=true;
    END IF;
  END IF;
  UPDATE public.availability_rules SET daily_limit=r.daily_limit,is_blocked=r.is_blocked,
    notes=coalesce(p_changes->>'notes',r.notes),updated_at=now() WHERE id=r.id;
  RETURN public.menu_availability(p_date);
END $$;
REVOKE ALL ON FUNCTION public.set_item_inventory(text,date,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_item_inventory(text,date,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_blocked_date(p_date date,p_blocked boolean,p_reason text DEFAULT 'Closed')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_date IS NULL OR p_blocked IS NULL THEN RAISE EXCEPTION 'Date and blocked status are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory-date:'||p_date::text,0));
  IF p_blocked THEN
    INSERT INTO public.blocked_dates(blocked_date,reason) VALUES(p_date,coalesce(nullif(trim(p_reason),''),'Closed'))
    ON CONFLICT(blocked_date) DO UPDATE SET reason=excluded.reason;
  ELSE DELETE FROM public.blocked_dates WHERE blocked_date=p_date;
  END IF;
  RETURN public.menu_availability(p_date);
END $$;
REVOKE ALL ON FUNCTION public.set_blocked_date(date,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_blocked_date(date,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.place_inventory_order(p_request_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tz text; today date; target date; slot time; scheduled timestamptz; item record;
  m public.menu_items; r public.availability_rules; subtotal numeric:=0; fee numeric; tax numeric;
  order_id text; result jsonb; receipt public.inventory_checkout_requests; fingerprint text;
  uid uuid; cart jsonb; mode text;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid order request'; END IF;
  uid:=auth.uid();
  fingerprint:=md5(p_payload::text||coalesce(uid::text,'guest'));
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_request_id::text,0));
  SELECT * INTO receipt FROM public.inventory_checkout_requests WHERE request_id=p_request_id;
  IF FOUND THEN
    IF receipt.fingerprint<>fingerprint THEN RAISE EXCEPTION 'This checkout request was already used with different details'; END IF;
    RETURN receipt.result;
  END IF;
  SELECT timezone INTO STRICT tz FROM public.bakery_settings WHERE id;
  today:=(now() AT TIME ZONE tz)::date;
  mode:=p_payload->>'mode';
  IF mode IS NULL OR mode NOT IN ('now','later') THEN RAISE EXCEPTION 'Choose now or schedule for later'; END IF;
  IF mode='later' THEN
    target:=(p_payload->>'date')::date; slot:=(p_payload->>'time')::time;
    IF target IS NULL OR slot IS NULL THEN RAISE EXCEPTION 'Choose a date and time'; END IF;
    scheduled:=(target+slot) AT TIME ZONE tz;
    IF scheduled<=now() OR target>today+365 THEN RAISE EXCEPTION 'Choose a future time within the next 365 days'; END IF;
    IF (scheduled AT TIME ZONE tz)::timestamp<>target+slot THEN RAISE EXCEPTION 'That local time does not exist; choose another time'; END IF;
  ELSE target:=today;
  END IF;
  IF length(trim(coalesce(p_payload->>'customer_name','')))=0 OR length(trim(coalesce(p_payload->>'customer_phone','')))=0 THEN
    RAISE EXCEPTION 'Name and phone number are required';
  END IF;
  IF coalesce(p_payload->>'delivery_type','') NOT IN ('delivery','pickup') OR coalesce(p_payload->>'payment_method','') NOT IN ('cash','zelle') THEN
    RAISE EXCEPTION 'Invalid delivery or payment method';
  END IF;
  IF p_payload->>'delivery_type'='delivery' AND length(trim(coalesce(p_payload->>'customer_address','')))=0 THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  cart:=p_payload->'items';
  IF jsonb_typeof(cart) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Cart must contain menu items'; END IF;
  IF jsonb_array_length(cart)=0 OR jsonb_array_length(cart)>100 THEN RAISE EXCEPTION 'Cart must contain between 1 and 100 items'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(cart) x WHERE coalesce(x->>'id','')='' OR coalesce(x->>'qty','') !~ '^[1-9][0-9]{0,5}$') THEN
    RAISE EXCEPTION 'Item quantities must be positive whole numbers';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory-date:'||target::text,0));
  IF EXISTS(SELECT 1 FROM public.blocked_dates WHERE blocked_date=target) THEN RAISE EXCEPTION 'The bakery is closed on this date. Please choose another date.'; END IF;
  FOR item IN SELECT x->>'id' AS id,sum((x->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(cart) x GROUP BY x->>'id' ORDER BY x->>'id'
  LOOP
    SELECT * INTO m FROM public.menu_items WHERE id=item.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'An item in your cart is no longer on the menu. Please remove it.'; END IF;
    IF item.qty>m.max_qty_per_order THEN RAISE EXCEPTION 'Maximum % per order for %',m.max_qty_per_order,m.name; END IF;
    INSERT INTO public.availability_rules(item_id,rule_date) VALUES(m.id,target) ON CONFLICT(item_id,rule_date) DO NOTHING;
    SELECT * INTO r FROM public.availability_rules WHERE item_id=m.id AND rule_date=target FOR UPDATE;
    IF r.is_blocked OR greatest(0,coalesce(r.daily_limit,m.default_daily_quantity)-r.orders_taken)<item.qty THEN
      RAISE EXCEPTION 'Not enough stock for % on %. Please update your cart or date.',m.name,target;
    END IF;
    UPDATE public.availability_rules SET orders_taken=orders_taken+item.qty,updated_at=now() WHERE id=r.id;
    subtotal:=subtotal+m.price*item.qty;
  END LOOP;
  subtotal:=round(subtotal,2); fee:=CASE WHEN p_payload->>'delivery_type'='delivery' THEN 3.50 ELSE 0 END; tax:=round(subtotal*0.08,2);
  order_id:='LB-'||upper(replace(gen_random_uuid()::text,'-',''));
  INSERT INTO public.orders(id,user_id,customer_name,customer_phone,customer_address,delivery_type,payment_method,
    subtotal,delivery_fee,tax,total,status,notes,fulfillment_date,fulfillment_time,scheduled_for,fulfillment_timezone,inventory_reserved)
  VALUES(order_id,uid,trim(p_payload->>'customer_name'),trim(p_payload->>'customer_phone'),coalesce(p_payload->>'customer_address','Pickup'),
    (p_payload->>'delivery_type')::public.delivery_type,(p_payload->>'payment_method')::public.payment_method,
    subtotal,fee,tax,subtotal+fee+tax,'pending',coalesce(p_payload->>'notes',''),target,slot,scheduled,tz,true);
  INSERT INTO public.order_items(order_id,item_id,name,qty,price)
  SELECT order_id,catalog.id,catalog.name,c.qty,catalog.price FROM
    (SELECT x->>'id' AS id,sum((x->>'qty')::integer)::integer AS qty FROM jsonb_array_elements(cart) x GROUP BY x->>'id') c
    JOIN public.menu_items catalog ON catalog.id=c.id;
  result:=jsonb_build_object('id',order_id,'total',subtotal+fee+tax,'date',target,'time',slot,'scheduled_for',scheduled,'timezone',tz);
  INSERT INTO public.inventory_checkout_requests VALUES(p_request_id,fingerprint,order_id,result,now());
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.place_inventory_order(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_inventory_order(uuid,jsonb) TO anon,authenticated;

-- Cancellation releases only this order/date, exactly once. Existing historical
-- orders have inventory_reserved=false and never alter the new counters.
CREATE OR REPLACE FUNCTION public.release_order_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.status='cancelled' AND NEW.status<>'cancelled' THEN RAISE EXCEPTION 'Cancelled orders cannot be reopened; place a new order'; END IF;
    IF NEW.status<>'cancelled' THEN RETURN NEW; END IF;
  END IF;
  IF OLD.inventory_reserved THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('inventory-date:'||OLD.fulfillment_date::text,0));
    UPDATE public.availability_rules r SET orders_taken=greatest(0,r.orders_taken-i.qty),updated_at=now()
      FROM (SELECT item_id,sum(qty)::integer AS qty FROM public.order_items WHERE order_id=OLD.id GROUP BY item_id) i
      WHERE r.item_id=i.item_id AND r.rule_date=OLD.fulfillment_date;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  NEW.inventory_reserved:=false;
  RETURN NEW;
END $$;
CREATE TRIGGER inventory_order_cancel BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.release_order_inventory();
CREATE TRIGGER inventory_order_delete BEFORE DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.release_order_inventory();

-- Direct inserts/stock-counter writes would bypass the transaction. Keep reads
-- public and route stock/calendar/order creation through the above RPCs only.
REVOKE INSERT,UPDATE,DELETE ON public.availability_rules,public.blocked_dates,public.menu_stock FROM anon,authenticated;
REVOKE INSERT,DELETE ON public.orders FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.order_items FROM anon,authenticated;
REVOKE UPDATE ON public.orders FROM anon,authenticated;
GRANT UPDATE(status,updated_at) ON public.orders TO authenticated;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND cmd IN ('UPDATE','ALL') LOOP
    EXECUTE format('DROP POLICY %I ON public.orders',p.policyname);
  END LOOP;
END $$;
CREATE POLICY inventory_admin_order_status ON public.orders FOR UPDATE TO authenticated
  USING(public.is_admin_user()) WITH CHECK(public.is_admin_user());
-- Legacy status RPC also drives orders through a trigger; do not let guests
-- change another order's status/cancel its reservation.
REVOKE EXECUTE ON FUNCTION public.upsert_order_status_event(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.order_status_events FROM anon,authenticated;

DO $$ DECLARE t text; BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF;
  FOREACH t IN ARRAY ARRAY['menu_items','availability_rules','blocked_dates','orders','order_status_events','bakery_settings'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';