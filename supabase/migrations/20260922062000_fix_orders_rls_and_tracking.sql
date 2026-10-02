-- ============================================================
-- Migration: Fix orders FK, RLS policies, and order tracking
-- ============================================================

-- 1. Fix orders.user_id FK: change from user_profiles to auth.users
--    This prevents FK violations when user_profile doesn't exist yet
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Fix favorites.user_id FK: also allow direct auth.users reference
--    Keep user_profiles FK but ensure user_profiles exist for all auth users
--    Insert missing user_profiles for existing auth users
INSERT INTO public.user_profiles (id, email, full_name)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public (anon) to read orders by ID for order tracking page
DROP POLICY IF EXISTS "public_read_orders_by_id" ON public.orders;
CREATE POLICY "public_read_orders_by_id"
  ON public.orders FOR SELECT TO anon
  USING (true);

-- 4. Allow public (anon) to read order_items for order tracking
DROP POLICY IF EXISTS "public_read_order_items" ON public.order_items;
CREATE POLICY "public_read_order_items"
  ON public.order_items FOR SELECT TO anon
  USING (true);

-- 5. Insert initial 'pending' status event when a new order is created
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.order_status_events (order_id, status, message, created_at)
  VALUES (NEW.id, 'pending', 'Order received and awaiting confirmation', NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_order ON public.orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();

-- 6. Allow anon to insert orders (guest checkout) and order items
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items"
  ON public.order_items FOR INSERT TO anon
  WITH CHECK (true);

-- 7. Ensure authenticated users can also insert orders with their user_id
DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
CREATE POLICY "users_insert_own_orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 8. Ensure authenticated users can read their own orders
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
CREATE POLICY "users_view_own_orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 9. Ensure authenticated users can read their own order_items
DROP POLICY IF EXISTS "users_view_own_order_items" ON public.order_items;
CREATE POLICY "users_view_own_order_items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );
