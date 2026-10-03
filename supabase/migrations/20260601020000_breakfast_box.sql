-- Breakfast Box: assign menu items to a box role (main/side/drink) and expose it via menu_availability

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS box_role text;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_box_role_check;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_box_role_check
  CHECK (box_role IS NULL OR box_role IN ('main','side','drink'));

CREATE OR REPLACE FUNCTION public.menu_availability(p_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE tz text; today date; target date; closed boolean; reason text; entries jsonb;
BEGIN
  SELECT timezone INTO STRICT tz FROM public.bakery_settings WHERE id;
  today := (now() AT TIME ZONE tz)::date;
  target := coalesce(p_date,today);
  SELECT b.reason INTO reason FROM public.blocked_dates b WHERE blocked_date=target;
  closed := FOUND;
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.category,a.name),'[]'::jsonb) INTO entries
  FROM (
    SELECT m.id,m.name,m.category,m.price,m.description,m.image,m.alt,m.popular,m.badges,m.calories,m.box_role,
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
END $function$;

NOTIFY pgrst,'reload schema';
