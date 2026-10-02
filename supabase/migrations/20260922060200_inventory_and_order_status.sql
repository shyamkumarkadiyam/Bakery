-- ============================================================
-- Migration: Inventory stock levels + Order status events
-- ============================================================

-- 1. menu_stock table: per-item stock levels and quantity limits
CREATE TABLE IF NOT EXISTS public.menu_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  stock_qty INTEGER NOT NULL DEFAULT 0,
  max_qty_per_order INTEGER NOT NULL DEFAULT 10,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_stock_item_id ON public.menu_stock(item_id);

ALTER TABLE public.menu_stock ENABLE ROW LEVEL SECURITY;

-- Public can read stock (needed for menu browser)
DROP POLICY IF EXISTS "public_read_menu_stock" ON public.menu_stock;
CREATE POLICY "public_read_menu_stock"
  ON public.menu_stock FOR SELECT TO public USING (true);

-- Admin function for write access
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

DROP POLICY IF EXISTS "admin_manage_menu_stock" ON public.menu_stock;
CREATE POLICY "admin_manage_menu_stock"
  ON public.menu_stock FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 2. order_status_events table: timeline events per order
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id ON public.order_status_events(order_id);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- Public can read order events (for order status page)
DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;
CREATE POLICY "public_read_order_status_events"
  ON public.order_status_events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
CREATE POLICY "admin_manage_order_status_events"
  ON public.order_status_events FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Allow authenticated users to insert events for their own orders
DROP POLICY IF EXISTS "users_insert_own_order_events" ON public.order_status_events;
CREATE POLICY "users_insert_own_order_events"
  ON public.order_status_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
    )
  );

-- 3. Trigger: auto-insert status event when order status changes
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  msg TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    msg := CASE NEW.status
      WHEN 'pending'    THEN 'Order received and awaiting confirmation'
      WHEN 'confirmed'  THEN 'Order confirmed by the bakery'
      WHEN 'packaging'  THEN 'Your order is being prepared and packaged'
      WHEN 'enroute'    THEN 'Your order is on the way!'
      WHEN 'delivered'  THEN 'Order delivered successfully'
      WHEN 'pickup'     THEN 'Order is ready for pickup'
      WHEN 'cancelled'  THEN 'Order has been cancelled'
      ELSE 'Order status updated'
    END;

    INSERT INTO public.order_status_events (order_id, status, message, created_at)
    VALUES (NEW.id, NEW.status::TEXT, msg, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

-- 4. Seed initial stock data from menu items
DO $$
BEGIN
  INSERT INTO public.menu_stock (item_id, item_name, category, stock_qty, max_qty_per_order, low_stock_threshold, is_available)
  VALUES
    ('arepa-001', 'Reina Pepiada',              'arepa',    24, 5, 5, true),
    ('arepa-002', 'Pabellón Arepa',              'arepa',    18, 5, 5, true),
    ('arepa-003', 'Pelúa Arepa',                 'arepa',    15, 5, 5, true),
    ('arepa-004', 'Domino Arepa',                'arepa',    20, 5, 5, true),
    ('empanada-001', 'Beef & Potato Empanada',   'empanada', 30, 10, 8, true),
    ('empanada-002', 'Cheese & Jalapeño Empanada','empanada',25, 10, 8, true),
    ('empanada-003', 'Shrimp & Cilantro Empanada','empanada',12, 6, 5, true),
    ('patacon-001', 'Pabellón Patacón',          'patacon',  10, 4, 4, true),
    ('patacon-002', 'Chicken & Avocado Patacón', 'patacon',   8, 4, 4, true),
    ('cachapa-001', 'Classic Cachapa',           'cachapa',  16, 5, 5, true),
    ('cachapa-002', 'Cachapa con Pernil',        'cachapa',   0, 5, 5, false),
    ('tequeno-001', 'Classic Tequeños (6pc)',    'tequeno',  40, 10, 10, true),
    ('tequeno-002', 'Nutella Tequeños (4pc)',    'tequeno',   3, 6, 5, true),
    ('sweet-001',   'Bienmesabe Cup',            'sweet',    20, 8, 5, true),
    ('sweet-002',   'Quesillo Slice',            'sweet',     6, 4, 4, true)
  ON CONFLICT (item_id) DO NOTHING;
END $$;
