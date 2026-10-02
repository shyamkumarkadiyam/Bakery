'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import OrderFilters from './OrderFilters';
import OrderTable from './OrderTable';
import OrderDetailPanel from './OrderDetailPanel';
import { Order } from '@/data/ordersData';
import { createClient } from '@/lib/supabase/client';

function mapRow(row: any): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    items: (row.order_items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    tax: row.tax,
    total: row.total,
    status: row.status,
    type: row.delivery_type,
    placedAt: row.placed_at
      ? new Date(row.placed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '',
    notes: row.notes || '',
  };
}

export default function OrderManagementClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);
  // Track pending status updates to prevent real-time subscription from overwriting them
  const pendingUpdates = useRef<Map<string, string>>(new Map());

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(name, qty, price)')
        .order('placed_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setOrders((prev) => {
          const mapped = data.map(mapRow);
          // Apply any pending updates that haven't been confirmed by DB yet
          return mapped.map((o) => {
            const pending = pendingUpdates.current.get(o.id);
            if (pending) return { ...o, status: pending as Order['status'] };
            return o;
          });
        });
        // Update selectedOrder if it exists in the new data
        setSelectedOrder((prev) => {
          if (!prev) return null;
          const updated = data.find((r: any) => r.id === prev.id);
          if (!updated) return prev;
          const mapped = mapRow(updated);
          const pending = pendingUpdates.current.get(prev.id);
          return pending ? { ...mapped, status: pending as Order['status'] } : mapped;
        });
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    const matchFilter = activeFilter === 'all' || o.status === activeFilter;
    const matchSearch =
      search.trim() === '' ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    // Optimistically update UI immediately
    setUpdatingIds((prev) => new Set(prev).add(orderId));
    pendingUpdates.current.set(orderId, newStatus);

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));

    try {
      // Update order status in DB
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (updateError) {
        console.error('Update status error:', updateError);
        // Revert optimistic update on failure
        pendingUpdates.current.delete(orderId);
        await fetchOrders();
        return;
      }

      // Explicitly upsert into order_status_events via SECURITY DEFINER RPC
      // Uses INSERT ... ON CONFLICT (order_id) DO UPDATE — one row per order
      const statusMessages: Record<string, string> = {
        pending: 'Order received and awaiting confirmation',
        confirmed: 'Order confirmed by the bakery',
        packaging: 'Your order is being prepared and packaged',
        enroute: 'Your order is on the way!',
        delivered: 'Order delivered successfully',
        pickup: 'Order is ready for pickup',
        cancelled: 'Order has been cancelled',
      };

      const { error: eventError } = await supabase.rpc('upsert_order_status_event', {
        p_order_id: orderId,
        p_status: newStatus,
        p_message: statusMessages[newStatus] ?? 'Order status updated',
      });

      if (eventError) {
        console.error('Insert order_status_events error:', eventError);
        // Non-fatal: order status was already updated successfully
      }

    } catch (err) {
      console.error('Update status error:', err);
      pendingUpdates.current.delete(orderId);
      await fetchOrders();
    } finally {
      // Clear pending after a short delay to let real-time sync settle
      setTimeout(() => {
        pendingUpdates.current.delete(orderId);
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 2000);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    packaging: orders.filter((o) => o.status === 'packaging').length,
    enroute: orders.filter((o) => o.status === 'enroute').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    pickup: orders.filter((o) => o.status === 'pickup').length,
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl border border-border shadow-card px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-center sm:items-center gap-0.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center sm:text-left">Total Today</span>
          <span className="text-lg sm:text-xl font-extrabold text-foreground font-tabular">{orders.length}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">orders</span>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-card px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-center sm:items-center gap-0.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center sm:text-left">Revenue</span>
          <span className="text-lg sm:text-xl font-extrabold text-green-text font-tabular">
            ${orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}
          </span>
        </div>
        <div className="bg-amber-soft rounded-2xl border border-amber-text/20 shadow-card px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-center sm:items-center gap-0.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-text uppercase tracking-wider text-center sm:text-left">Needs Action</span>
          <span className="text-lg sm:text-xl font-extrabold text-amber-text font-tabular">
            {statusCounts.pending + statusCounts.confirmed}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          <OrderFilters
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            counts={statusCounts}
            search={search}
            setSearch={setSearch}
          />

          <div className="grid xl:grid-cols-3 gap-5">
            <div className={selectedOrder ? 'xl:col-span-2' : 'xl:col-span-3'}>
              <OrderTable
                orders={filtered}
                selectedId={selectedOrder?.id ?? null}
                onSelect={setSelectedOrder}
                onUpdateStatus={updateStatus}
                updatingIds={updatingIds}
              />
            </div>
            {selectedOrder && (
              <div className="xl:col-span-1">
                <OrderDetailPanel
                  order={selectedOrder}
                  onClose={() => setSelectedOrder(null)}
                  onUpdateStatus={updateStatus}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}