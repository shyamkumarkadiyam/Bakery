-- ============================================================
-- Migration: Make order_id the primary key on order_status_events
-- One row per order — status/message/timestamp are updated in-place
-- ============================================================

-- Step 1: Drop the trigger that inserts rows (we'll recreate it as upsert)
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;

-- Step 2: Drop the old RPC function
DROP FUNCTION IF EXISTS public.insert_order_status_event(TEXT, TEXT, TEXT);

-- Step 3: Drop all existing policies on order_status_events
DROP POLICY IF EXISTS "ose_public_read" ON public.order_status_events;
DROP POLICY IF EXISTS "ose_authenticated_insert" ON public.order_status_events;
DROP POLICY IF EXISTS "ose_authenticated_all" ON public.order_status_events;
DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "users_insert_own_order_events" ON public.order_status_events;
DROP POLICY IF EXISTS "authenticated_insert_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "authenticated_manage_order_status_events" ON public.order_status_events;

-- Step 4: Rebuild order_status_events with order_id as primary key
-- First deduplicate: keep only the latest row per order_id
DELETE FROM public.order_status_events ose
WHERE ose.id NOT IN (
  SELECT DISTINCT ON (order_id) id
  FROM public.order_status_events
  ORDER BY order_id, created_at DESC
);

-- Drop the old UUID primary key and id column
ALTER TABLE public.order_status_events DROP CONSTRAINT IF EXISTS order_status_events_pkey;
ALTER TABLE public.order_status_events DROP COLUMN IF EXISTS id;

-- Drop old index on order_id (will be replaced by PK index)
DROP INDEX IF EXISTS idx_order_status_events_order_id;

-- Add updated_at column to track when status was last changed
ALTER TABLE public.order_status_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Make order_id the primary key
ALTER TABLE public.order_status_events
  ADD CONSTRAINT order_status_events_pkey PRIMARY KEY (order_id);

-- Ensure the FK to orders still exists
ALTER TABLE public.order_status_events
  DROP CONSTRAINT IF EXISTS order_status_events_order_id_fkey;
ALTER TABLE public.order_status_events
  ADD CONSTRAINT order_status_events_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Re-enable RLS
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate RLS policies
-- Public read (order tracking page)
DROP POLICY IF EXISTS "ose_public_read" ON public.order_status_events;
CREATE POLICY "ose_public_read"
  ON public.order_status_events FOR SELECT TO public USING (true);

-- Authenticated full access (admin + customer inserts via RPC)
DROP POLICY IF EXISTS "ose_authenticated_all" ON public.order_status_events;
CREATE POLICY "ose_authenticated_all"
  ON public.order_status_events FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 6: New SECURITY DEFINER RPC — upserts (one row per order)
CREATE OR REPLACE FUNCTION public.upsert_order_status_event(
  p_order_id TEXT,
  p_status   TEXT,
  p_message  TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_status_events (order_id, status, message, created_at, updated_at)
  VALUES (p_order_id, p_status, p_message, NOW(), NOW())
  ON CONFLICT (order_id) DO UPDATE
    SET status     = EXCLUDED.status,
        message    = EXCLUDED.message,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_order_status_event(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_order_status_event(TEXT, TEXT, TEXT) TO anon;

-- Step 7: Recreate trigger to use upsert logic
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    msg := CASE NEW.status
      WHEN 'pending'   THEN 'Order received and awaiting confirmation'
      WHEN 'confirmed' THEN 'Order confirmed by the bakery'
      WHEN 'packaging' THEN 'Your order is being prepared and packaged'
      WHEN 'enroute'   THEN 'Your order is on the way!'
      WHEN 'delivered' THEN 'Order delivered successfully'
      WHEN 'pickup'    THEN 'Order is ready for pickup'
      WHEN 'cancelled' THEN 'Order has been cancelled'
      ELSE 'Order status updated'
    END;

    INSERT INTO public.order_status_events (order_id, status, message, created_at, updated_at)
    VALUES (NEW.id, NEW.status::TEXT, msg, NOW(), NOW())
    ON CONFLICT (order_id) DO UPDATE
      SET status     = EXCLUDED.status,
          message    = EXCLUDED.message,
          updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();
