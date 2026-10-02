-- ============================================================
-- Migration: Admin role column + fix orders RLS for status updates
-- ============================================================

-- 1. Add role column to user_profiles if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

-- 2. Update handle_new_user trigger to capture role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  RETURN NEW;
END;
$$;

-- 3. is_admin function: checks both auth metadata AND user_profiles role
-- This ensures admin works even if only one source has the role set
CREATE OR REPLACE FUNCTION public.is_admin()
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
OR EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.id = auth.uid()
  AND up.role = 'admin'
)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.is_admin()
$$;

-- 4. Fix orders RLS: admin must be able to UPDATE any order (status changes)
-- Drop and recreate the update policy with proper admin check
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
CREATE POLICY "admin_update_orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Keep user update policy separate (users can update their own orders)
DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;
CREATE POLICY "users_update_own_orders"
ON public.orders FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND NOT public.is_admin())
WITH CHECK (user_id = auth.uid());

-- 5. Fix order_status_events: admin must be able to INSERT events
-- The trigger (handle_order_status_change) runs as SECURITY DEFINER so it bypasses RLS
-- But direct inserts from admin client also need to work
DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
CREATE POLICY "admin_manage_order_status_events"
ON public.order_status_events FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow any authenticated user to insert status events for orders they can see
DROP POLICY IF EXISTS "users_insert_own_order_events" ON public.order_status_events;
CREATE POLICY "users_insert_own_order_events"
ON public.order_status_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.user_id = auth.uid() OR public.is_admin())
  )
);

-- 6. Admin can SELECT all orders (fix view policy too)
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
CREATE POLICY "users_view_own_orders"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- 7. Admin can SELECT all order_items
DROP POLICY IF EXISTS "users_view_own_order_items" ON public.order_items;
CREATE POLICY "users_view_own_order_items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())
  )
);

-- 8. Sync existing admin users: update user_profiles role for any user
-- whose auth metadata already has role=admin
DO $$
BEGIN
  UPDATE public.user_profiles up
  SET role = 'admin'
  FROM auth.users au
  WHERE au.id = up.id
  AND (
    au.raw_user_meta_data->>'role' = 'admin'
    OR au.raw_app_meta_data->>'role' = 'admin'
  )
  AND up.role != 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not sync admin roles: %', SQLERRM;
END $$;
