-- ============================================================
-- Migration: Fix order_status_events RLS to allow any authenticated user to insert
-- The admin portal is open (no role restriction), so any authenticated user
-- must be able to insert status events when updating order status.
-- Also ensures the trigger function is recreated with SECURITY DEFINER.
-- ============================================================

-- Drop all existing policies on order_status_events
DROP POLICY IF EXISTS "admin_manage_order_status_events" ON public.order_status_events;
DROP POLICY IF EXISTS "users_insert_own_order_events" ON public.order_status_events;
DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;

-- Public read: anyone can read order status events (for order tracking page)
CREATE POLICY "public_read_order_status_events"
ON public.order_status_events FOR SELECT TO public USING (true);

-- Any authenticated user can insert status events (admin portal is open)
CREATE POLICY "authenticated_insert_order_status_events"
ON public.order_status_events FOR INSERT TO authenticated
WITH CHECK (true);

-- Any authenticated user can update/delete status events
CREATE POLICY "authenticated_manage_order_status_events"
ON public.order_status_events FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Recreate the trigger function with SECURITY DEFINER to ensure it bypasses RLS
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
