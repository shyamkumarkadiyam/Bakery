-- ============================================================
-- Migration: orders, order_items, user_profiles, favorites
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','packaging','enroute','delivered','pickup','cancelled');

DROP TYPE IF EXISTS public.delivery_type CASCADE;
CREATE TYPE public.delivery_type AS ENUM ('delivery','pickup');

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM ('card','cash','zelle');

-- 2. TABLES

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_address TEXT NOT NULL DEFAULT '',
  delivery_type public.delivery_type NOT NULL DEFAULT 'delivery',
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  placed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_image TEXT DEFAULT '',
  item_category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON public.orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);

-- 4. FUNCTIONS

-- Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Admin check via auth metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users
  WHERE id = auth.uid()
  AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
)
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_read_all_user_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- orders: users see own, admins see all
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
CREATE POLICY "users_view_own_orders"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
CREATE POLICY "users_insert_own_orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
CREATE POLICY "admin_update_orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- Allow anonymous order inserts (guest checkout)
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders"
ON public.orders FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

-- order_items: follow parent order access
DROP POLICY IF EXISTS "users_view_own_order_items" ON public.order_items;
CREATE POLICY "users_view_own_order_items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
CREATE POLICY "insert_order_items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items"
ON public.order_items FOR INSERT TO anon
WITH CHECK (true);

-- favorites
DROP POLICY IF EXISTS "users_manage_own_favorites" ON public.favorites;
CREATE POLICY "users_manage_own_favorites"
ON public.favorites FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
