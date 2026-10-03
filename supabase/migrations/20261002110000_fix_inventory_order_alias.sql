-- Repair deployments which applied the first date-inventory migration before
-- the order-items SELECT alias was disambiguated from the PL/pgSQL record m.
DO $repair$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.place_inventory_order(uuid,jsonb)'::regprocedure) INTO definition;
  definition := replace(definition,
    'SELECT order_id,m.id,m.name,c.qty,m.price FROM',
    'SELECT order_id,catalog.id,catalog.name,c.qty,catalog.price FROM');
  definition := replace(definition,
    'JOIN public.menu_items m ON m.id=c.id;',
    'JOIN public.menu_items catalog ON catalog.id=c.id;');
  EXECUTE definition;
END $repair$;
NOTIFY pgrst,'reload schema';