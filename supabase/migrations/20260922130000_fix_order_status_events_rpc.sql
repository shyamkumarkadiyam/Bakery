-- ============================================================
-- Migration: Add SECURITY DEFINER RPC for order_status_events inserts
-- This bypasses RLS entirely for status event inserts, which is
-- the most reliable approach when the inserting user may not own the order.
-- ============================================================

-- Drop ALL existing policies on order_status_events to start clean
DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "users_insert_own_order_events" ON public.order_status_events;
DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "authenticated_insert_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "authenticated_manage_order_status_events" ON public.order_status_events;

-- Public read: anyone can read order status events (for order tracking page)
DROP POLICY IF EXISTS "ose_public_read" ON public.order_status_events;
CREATE POLICY "ose_public_read"
ON public.order_status_events FOR SELECT TO public USING (true);

-- Authenticated users can insert (belt-and-suspenders alongside RPC)
DROP POLICY IF EXISTS "ose_authenticated_insert" ON public.order_status_events;
CREATE POLICY "ose_authenticated_insert"
ON public.order_status_events FOR INSERT TO authenticated
WITH CHECK (true);

-- Authenticated users can update/delete
DROP POLICY IF EXISTS "ose_authenticated_all" ON public.order_status_events;
CREATE POLICY "ose_authenticated_all"
ON public.order_status_events FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- SECURITY DEFINER function: inserts a status event bypassing RLS
-- Called from the client via supabase.rpc('insert_order_status_event', {...})
CREATE OR REPLACE FUNCTION public.insert_order_status_event(
  p_order_id TEXT,
  p_status TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_status_events (order_id, status, message, created_at)
  VALUES (p_order_id, p_status, p_message, NOW());
END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.insert_order_status_event(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_order_status_event(TEXT, TEXT, TEXT) TO anon;

-- Recreate the trigger function with SECURITY DEFINER (ensures trigger also works)
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();
