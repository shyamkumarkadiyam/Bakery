-- ============================================================
-- Migration: Fix order status sync between orders and order_status_events
-- Ensures orders.status always matches order_status_events.status
-- Direction 1: orders.status change → upsert order_status_events row
-- Direction 2: order_status_events.status change → update orders.status
-- ============================================================

-- -------------------------------------------------------
-- Step 1: Drop existing triggers to avoid conflicts
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS on_order_status_event_change ON public.order_status_events;

-- -------------------------------------------------------
-- Step 2: Drop existing functions to recreate cleanly
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS public.handle_order_status_change();
DROP FUNCTION IF EXISTS public.handle_order_status_event_change();

-- -------------------------------------------------------
-- Step 3: Recreate upsert_order_status_event RPC
-- (SECURITY DEFINER so anon/authenticated can call it)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- Step 4: Trigger function: orders.status → order_status_events
-- Fires AFTER UPDATE OF status ON orders
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT;
BEGIN
  -- Only act when status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    msg := CASE NEW.status::TEXT
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

-- -------------------------------------------------------
-- Step 5: Trigger function: order_status_events.status → orders.status
-- Fires AFTER UPDATE OF status ON order_status_events
-- Keeps orders table in sync if order_status_events is updated directly
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_order_status_event_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.orders
    SET status     = NEW.status::public.order_status,
        updated_at = NOW()
    WHERE id = NEW.order_id
      AND status::TEXT IS DISTINCT FROM NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- Step 6: Create triggers
-- -------------------------------------------------------

-- Trigger 1: orders → order_status_events (admin changes order status)
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

-- Trigger 2: order_status_events → orders (if event row updated directly)
CREATE TRIGGER on_order_status_event_change
  AFTER UPDATE OF status ON public.order_status_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_event_change();

-- -------------------------------------------------------
-- Step 7: Back-fill any existing orders that have no matching
-- order_status_events row, or whose event row is out of sync
-- -------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  msg TEXT;
BEGIN
  FOR r IN
    SELECT o.id, o.status::TEXT AS status
    FROM public.orders o
    LEFT JOIN public.order_status_events ose ON ose.order_id = o.id
    WHERE ose.order_id IS NULL
       OR ose.status IS DISTINCT FROM o.status::TEXT
  LOOP
    msg := CASE r.status
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
    VALUES (r.id, r.status, msg, NOW(), NOW())
    ON CONFLICT (order_id) DO UPDATE
      SET status     = EXCLUDED.status,
          message    = EXCLUDED.message,
          updated_at = NOW();
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Back-fill failed: %', SQLERRM;
END $$;
