'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, ShoppingBag, Star, Package, TrendingUp, RefreshCw, Clock } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  pendingOrders: number;
  totalMenuItems: number;
  availableMenuItems: number;
  bestSeller: string;
  bestSellerCount: number;
  recentOrders: { id: string; customerName: string; total: number; status: string; placedAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packaging: 'bg-purple-100 text-purple-700',
  enroute: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  pickup: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    activeOrders: 0,
    pendingOrders: 0,
    totalMenuItems: 0,
    availableMenuItems: 0,
    bestSeller: '—',
    bestSellerCount: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const fetchStats = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [ordersRes, menuRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_name, total, status, placed_at, order_items(name, qty)')
          .gte('placed_at', todayStart.toISOString())
          .order('placed_at', { ascending: false }),
        supabase.from('menu_items').select('id, available'),
      ]);

      const orders = ordersRes.data || [];
      const menuItems = menuRes.data || [];

      const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const activeStatuses = ['pending', 'confirmed', 'packaging', 'enroute'];
      const activeOrders = orders.filter((o: any) => activeStatuses.includes(o.status)).length;
      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

      const itemCounts: Record<string, number> = {};
      orders.forEach((o: any) => {
        (o.order_items || []).forEach((item: any) => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.qty || 1);
        });
      });
      const bestEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

      const recentOrders = orders.slice(0, 8).map((o: any) => ({
        id: o.id,
        customerName: o.customer_name,
        total: o.total,
        status: o.status,
        placedAt: o.placed_at
          ? new Date(o.placed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '',
      }));

      setStats({
        todayRevenue: revenue,
        todayOrders: orders.length,
        activeOrders,
        pendingOrders,
        totalMenuItems: menuItems.length,
        availableMenuItems: menuItems.filter((m: any) => m.available).length,
        bestSeller: bestEntry ? bestEntry[0] : '—',
        bestSellerCount: bestEntry ? bestEntry[1] : 0,
        recentOrders,
      });
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('dashboard_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats, supabase]);

  const kpis = [
    {
      id: 'revenue',
      label: "Today\'s Revenue",
      value: loading ? '…' : `$${stats.todayRevenue.toFixed(2)}`,
      sub: `${stats.todayOrders} orders today`,
      icon: DollarSign,
      iconBg: 'bg-green-soft',
      iconColor: 'text-green-text',
      accent: 'border-l-4 border-l-green-text',
    },
    {
      id: 'active',
      label: 'Active Orders',
      value: loading ? '…' : String(stats.activeOrders),
      sub: `${stats.pendingOrders} need action`,
      icon: ShoppingBag,
      iconBg: 'bg-pink-light',
      iconColor: 'text-primary',
      accent: 'border-l-4 border-l-primary',
    },
    {
      id: 'bestseller',
      label: 'Best Seller Today',
      value: loading ? '…' : (stats.bestSeller.length > 16 ? stats.bestSeller.slice(0, 14) + '…' : stats.bestSeller),
      sub: stats.bestSellerCount > 0 ? `${stats.bestSellerCount} ordered` : 'No orders yet',
      icon: Star,
      iconBg: 'bg-yellow-light',
      iconColor: 'text-amber-text',
      accent: 'border-l-4 border-l-accent',
    },
    {
      id: 'menu',
      label: 'Menu Items',
      value: loading ? '…' : String(stats.availableMenuItems),
      sub: `of ${stats.totalMenuItems} total available`,
      icon: Package,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      accent: 'border-l-4 border-l-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">Good morning, Lolita! 🌸</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} — Miami, FL
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white border border-border rounded-full px-3 py-1.5 shadow-card">
          <div className="pulse-dot" />
          <span>Live{lastUpdated ? ` · Updated ${lastUpdated}` : ''}</span>
          <button onClick={fetchStats} className="hover:text-primary transition-colors ml-1">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.id} className={`rounded-3xl p-5 border border-border shadow-card bg-white ${kpi.accent}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${kpi.iconBg}`}>
                  <KpiIcon size={18} className={kpi.iconColor} />
                </div>
                <TrendingUp size={13} className="text-green-text" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-foreground font-tabular leading-tight">{kpi.value}</p>
              <p className="text-xs mt-1 font-medium text-muted-foreground">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-3xl border border-border shadow-card p-5">
        <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-pink-light text-primary border-2 border-primary/20 hover:bg-pink-mid transition-all"
          >
            <ShoppingBag size={16} />
            View Orders
            {stats.pendingOrders > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {stats.pendingOrders}
              </span>
            )}
          </Link>
          <Link
            href="/admin/menu"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-muted text-foreground border-2 border-border hover:bg-pink-light transition-all"
          >
            <Package size={16} />
            Manage Menu
          </Link>
          <Link
            href="/admin/availability"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-amber-soft text-amber-text border-2 border-amber-text/20 hover:bg-amber-100 transition-all"
          >
            <Clock size={16} />
            Set Availability
          </Link>
          <Link
            href="/admin/inventory"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-muted text-foreground border-2 border-border hover:bg-pink-light transition-all"
          >
            <Package size={16} />
            Inventory
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">Recent Orders Today</h3>
          <Link href="/admin/orders" className="text-xs text-primary font-semibold hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No orders yet today</div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-text font-tabular">${(order.total || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{order.placedAt}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}