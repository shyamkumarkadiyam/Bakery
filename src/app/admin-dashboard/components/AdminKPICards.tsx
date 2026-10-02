'use client';
import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Star, AlertTriangle, TrendingUp } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface KPIData {
  revenue: number;
  activeOrders: number;
  bestSeller: string;
  bestSellerCount: number;
  totalOrders: number;
}

export default function AdminKPICards() {
  const [kpiData, setKpiData] = useState<KPIData>({
    revenue: 0,
    activeOrders: 0,
    bestSeller: '—',
    bestSellerCount: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Get today's orders
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: orders } = await supabase
          .from('orders')
          .select('id, total, status, order_items(name, qty)')
          .gte('placed_at', todayStart.toISOString());

        if (orders && orders.length > 0) {
          const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
          const activeStatuses = ['pending', 'confirmed', 'packaging', 'enroute'];
          const activeOrders = orders.filter((o: any) => activeStatuses.includes(o.status)).length;

          // Count item occurrences
          const itemCounts: Record<string, number> = {};
          orders.forEach((o: any) => {
            (o.order_items || []).forEach((item: any) => {
              const key = item.name;
              itemCounts[key] = (itemCounts[key] || 0) + (item.qty || 1);
            });
          });
          const bestEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

          setKpiData({
            revenue,
            activeOrders,
            bestSeller: bestEntry ? bestEntry[0] : '—',
            bestSellerCount: bestEntry ? bestEntry[1] : 0,
            totalOrders: orders.length,
          });
        }
      } catch (err) {
        console.error('KPI fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  const kpis = [
    {
      id: 'kpi-revenue',
      label: "Today\'s Revenue",
      value: loading ? '...' : `$${kpiData.revenue.toFixed(2)}`,
      subtext: `${kpiData.totalOrders} orders today`,
      trend: 'up',
      icon: DollarSign,
      iconBg: 'bg-green-soft',
      iconColor: 'text-green-text',
      cardBg: 'bg-white',
      accent: 'border-l-4 border-l-green-text',
    },
    {
      id: 'kpi-orders',
      label: 'Active Orders',
      value: loading ? '...' : String(kpiData.activeOrders),
      subtext: 'Pending, confirmed, packaging, en route',
      trend: 'neutral',
      icon: ShoppingBag,
      iconBg: 'bg-pink-light',
      iconColor: 'text-primary',
      cardBg: 'bg-white',
      accent: 'border-l-4 border-l-primary',
    },
    {
      id: 'kpi-bestseller',
      label: 'Best Seller Today',
      value: loading ? '...' : (kpiData.bestSeller.length > 16 ? kpiData.bestSeller.slice(0, 14) + '…' : kpiData.bestSeller),
      subtext: kpiData.bestSellerCount > 0 ? `${kpiData.bestSellerCount} orders so far` : 'No orders yet',
      trend: 'up',
      icon: Star,
      iconBg: 'bg-yellow-light',
      iconColor: 'text-amber-text',
      cardBg: 'bg-white',
      accent: 'border-l-4 border-l-accent',
    },
    {
      id: 'kpi-total',
      label: 'Total Orders',
      value: loading ? '...' : String(kpiData.totalOrders),
      subtext: 'Orders placed today',
      trend: 'up',
      icon: AlertTriangle,
      iconBg: 'bg-amber-soft',
      iconColor: 'text-amber-text',
      cardBg: 'bg-amber-soft/40',
      accent: 'border-l-4 border-l-amber-text',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis?.map((kpi) => {
        const Icon = kpi?.icon;
        return (
          <div
            key={kpi?.id}
            className={`rounded-3xl p-5 border border-border shadow-card ${kpi?.cardBg} ${kpi?.accent}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${kpi?.iconBg}`}>
                <Icon size={18} className={kpi?.iconColor} />
              </div>
              {kpi?.trend === 'up' && (
                <div className="flex items-center gap-1 text-green-text text-xs font-bold">
                  <TrendingUp size={13} />
                  Up
                </div>
              )}
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {kpi?.label}
            </p>
            <p className="text-2xl font-extrabold text-foreground font-tabular leading-tight">
              {kpi?.value}
            </p>
            <p className="text-xs mt-1 font-medium text-muted-foreground">
              {kpi?.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}