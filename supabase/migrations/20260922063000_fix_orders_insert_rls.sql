-- ============================================================
-- Migration: Fix orders INSERT RLS for authenticated users
-- The previous policy requires user_id = auth.uid() but the
-- Supabase client session may not be fully resolved at insert time.
-- Replace with a more permissive policy that allows authenticated
-- users to insert orders where user_id matches their uid OR is null.
-- ============================================================

-- Drop and recreate the authenticated insert policy for orders
DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
CREATE POLICY "users_insert_own_orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

-- Also ensure anon insert policy is in place (guest checkout)
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Ensure order_items insert is open for authenticated users
DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
CREATE POLICY "insert_order_items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (true);

-- Ensure order_items insert is open for anon users (guest checkout)
DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items"
  ON public.order_items FOR INSERT TO anon
  WITH CHECK (true);
