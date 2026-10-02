-- ============================================================
-- Migration: Fix availability defaults and order status events RLS
-- ============================================================

-- 1. Update default daily_limit in availability_rules to 5
ALTER TABLE public.availability_rules
  ALTER COLUMN daily_limit SET DEFAULT 5;

-- 2. Ensure order_status_events has proper RLS for public read and admin write
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;
CREATE POLICY "public_read_order_status_events"
  ON public.order_status_events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
CREATE POLICY "admin_manage_order_status_events"
  ON public.order_status_events FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Ensure anon can also read order_status_events (for guest order tracking)
DROP POLICY IF EXISTS "anon_read_order_status_events" ON public.order_status_events;
CREATE POLICY "anon_read_order_status_events"
  ON public.order_status_events FOR SELECT TO anon USING (true);

-- 4. Ensure orders UPDATE is allowed for authenticated users (admin status changes)
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
CREATE POLICY "admin_update_orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Ensure anon can read orders (for guest order tracking)
DROP POLICY IF EXISTS "anon_read_orders" ON public.orders;
CREATE POLICY "anon_read_orders"
  ON public.orders FOR SELECT TO anon USING (true);
