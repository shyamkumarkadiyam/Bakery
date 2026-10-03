-- Breakfast Box orders: add is_box flag on order_items and teach place_inventory_order
-- to accept a `boxes` array (reserves component stock, records one box line per box).

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_box boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.place_inventory_order(p_request_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE tz text; today date; target date; slot time; scheduled timestamptz; item record;
  m public.menu_items; r public.availability_rules; subtotal numeric:=0; fee numeric; tax numeric;
  order_id text; result jsonb; receipt public.inventory_checkout_requests; fingerprint text;
  uid uuid; cart jsonb; reg jsonb; boxes jsonb; mode text;
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

  reg:=coalesce(p_payload->'items','[]'::jsonb);
  boxes:=coalesce(p_payload->'boxes','[]'::jsonb);
  IF jsonb_typeof(reg) IS DISTINCT FROM 'array' OR jsonb_typeof(boxes) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Cart must contain menu items'; END IF;
  -- Flatten regular items + all box components into one list for inventory reservation.
  SELECT coalesce(jsonb_agg(e),'[]'::jsonb) INTO cart FROM (
    SELECT e FROM jsonb_array_elements(reg) e
    UNION ALL
    SELECT comp FROM jsonb_array_elements(boxes) b, jsonb_array_elements(b->'items') comp
  ) s;
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
  -- Regular (non-box) line items
  INSERT INTO public.order_items(order_id,item_id,name,qty,price,is_box)
  SELECT order_id,catalog.id,catalog.name,c.qty,catalog.price,false FROM
    (SELECT x->>'id' AS id,sum((x->>'qty')::integer)::integer AS qty FROM jsonb_array_elements(reg) x GROUP BY x->>'id') c
    JOIN public.menu_items catalog ON catalog.id=c.id;
  -- One line per breakfast box, priced as the sum of its components
  INSERT INTO public.order_items(order_id,item_id,name,qty,price,is_box)
  SELECT order_id, NULL, coalesce(b->>'label','Breakfast Box'), 1,
    coalesce((SELECT sum(mi.price*(comp->>'qty')::integer) FROM jsonb_array_elements(b->'items') comp JOIN public.menu_items mi ON mi.id=comp->>'id'),0),
    true
  FROM jsonb_array_elements(boxes) b;
  result:=jsonb_build_object('id',order_id,'total',subtotal+fee+tax,'date',target,'time',slot,'scheduled_for',scheduled,'timezone',tz);
  INSERT INTO public.inventory_checkout_requests VALUES(p_request_id,fingerprint,order_id,result,now());
  RETURN result;
END $function$;

NOTIFY pgrst,'reload schema';
