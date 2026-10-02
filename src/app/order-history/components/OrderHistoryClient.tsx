'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Package, Clock, CheckCircle, Truck, Home, AlertCircle, ChevronRight, ShoppingBag, ArrowLeft, Wifi,  } from 'lucide-react';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  status: string;
  total: number;
  placedAt: string;
  deliveryType: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeClass: string; etaMins: number }> = {
  pending:   { label: 'Pending',          icon: Package,      badgeClass: 'status-pending',   etaMins: 45 },
  confirmed: { label: 'Confirmed',        icon: CheckCircle,  badgeClass: 'status-confirmed', etaMins: 40 },
  packaging: { label: 'Preparing',        icon: Clock,        badgeClass: 'status-packaging', etaMins: 30 },
  enroute:   { label: 'On the Way',       icon: Truck,        badgeClass: 'status-enroute',   etaMins: 15 },
  delivered: { label: 'Delivered',        icon: Home,         badgeClass: 'status-delivered', etaMins: 0  },
  pickup:    { label: 'Ready for Pickup', icon: Home,         badgeClass: 'status-pickup',    etaMins: 0  },
  cancelled: { label: 'Cancelled',        icon: AlertCircle,  badgeClass: 'bg-red-100 text-red-700', etaMins: 0 },
};

function getETA(status: string, placedAt: string): string | null {
  const cfg = STATUS_CONFIG[status];
  if (!cfg || cfg.etaMins === 0) return null;
  const eta = new Date(new Date(placedAt).getTime() + cfg.etaMins * 60 * 1000);
  return eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'packaging', 'enroute', 'pickup']);

export default function OrderHistoryClient() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(name, qty, price)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false });

      if (error) {
        console.error('Order history fetch error:', error);
        return;
      }

      const mapped: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        customerName: o.customer_name,
        status: o.status,
        total: o.total,
        placedAt: o.placed_at,
        deliveryType: o.delivery_type,
        items: (o.order_items || []).map((i: any) => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
      }));

      setOrders(mapped);
      setLiveCount(mapped.filter((o) => ACTIVE_STATUSES.has(o.status)).length);
    } catch (err) {
      console.error('Order history error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchOrders();

    // Real-time subscription for order updates — filter by user_id to avoid full table scans
    const channel = supabase
      .channel(`order_history_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => { fetchOrders(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => { fetchOrders(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, authLoading, user]);

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-pink-light flex items-center justify-center mx-auto mb-5">
          <ShoppingBag size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground font-sans mb-2">Sign in to see your orders</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Track your current orders and view your full order history after signing in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors font-sans"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Loading skeleton
  if (loading || authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 rounded-xl shimmer mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-card">
            <div className="flex justify-between">
              <div className="h-4 w-32 rounded shimmer" />
              <div className="h-5 w-20 rounded-full shimmer" />
            </div>
            <div className="h-3 w-24 rounded shimmer" />
            <div className="h-3 w-40 rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-foreground font-sans">My Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {liveCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-xs font-semibold text-green-700">
            <Wifi size={11} className="text-green-500" />
            {liveCount} live
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-pink-light flex items-center justify-center mx-auto mb-5">
            <ShoppingBag size={28} className="text-primary opacity-60" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground font-sans mb-2">No orders yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your order history will appear here once you place your first order.
          </p>
          <Link
            href="/menu-browser"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors font-sans"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <h2 className="text-sm font-extrabold text-foreground font-sans uppercase tracking-wide">
                  Active Orders
                </h2>
              </div>
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} isActive />
                ))}
              </div>
            </section>
          )}

          {/* Past Orders */}
          {pastOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-extrabold text-foreground font-sans uppercase tracking-wide mb-3">
                Past Orders
              </h2>
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <OrderCard key={order.id} order={order} isActive={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, isActive }: { order: Order; isActive: boolean }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];
  const StatusIcon = cfg.icon;
  const eta = getETA(order.status, order.placedAt);
  const isCancelled = order.status === 'cancelled';

  return (
    <Link
      href={`/order-status/${order.id}`}
      className={`block bg-white border rounded-2xl p-5 shadow-card transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isActive && !isCancelled ? 'border-primary/30' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + order info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCancelled
              ? 'bg-red-50'
              : isActive
              ? 'bg-primary/10' :'bg-muted'
          }`}>
            <StatusIcon
              size={18}
              className={isCancelled ? 'text-red-500' : isActive ? 'text-primary' : 'text-muted-foreground'}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-extrabold text-foreground font-sans truncate">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
              <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(order.placedAt)} · {formatTime(order.placedAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'} ·{' '}
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right: total + chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-extrabold text-foreground font-sans">${order.total.toFixed(2)}</p>
            {eta && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Clock size={10} className="text-primary" />
                <p className="text-[10px] font-semibold text-primary">ETA {eta}</p>
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </div>

      {/* Items preview */}
      {order.items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">
            {order.items
              .slice(0, 3)
              .map((i) => `${i.qty}× ${i.name}`)
              .join(', ')}
            {order.items.length > 3 && ` +${order.items.length - 3} more`}
          </p>
        </div>
      )}

      {/* Live update indicator for active orders */}
      {isActive && !isCancelled && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[10px] font-semibold text-green-600">Live updates · Tap to track</p>
        </div>
      )}
    </Link>
  );
}
