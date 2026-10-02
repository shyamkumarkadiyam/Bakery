-- ============================================================
-- Migration: Fix orders UPDATE RLS — allow any authenticated user to update
-- Admin portal is open (no role restriction), so any authenticated user
-- must be able to update order status from the admin orders page.
-- ============================================================

-- Drop the admin-only update policy (requires is_admin() which fails for non-admin users)
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;

-- Drop the user-own-orders update policy (too restrictive for admin portal)
DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;

-- Create a single open update policy: any authenticated user can update any order
DROP POLICY IF EXISTS "authenticated_update_orders" ON public.orders;
CREATE POLICY "authenticated_update_orders"
ON public.orders FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
