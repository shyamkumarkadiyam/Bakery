'use client';
import React, { useEffect, useState } from 'react';
import { ShoppingBag, CheckCircle, Bike, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface ActivityItem {
  id: string;
  type: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  detail: string;
  time: string;
  amount: string | null;
}

const statusIconMap: Record<string, { icon: React.ElementType; iconBg: string; iconColor: string }> = {
  pending: { icon: ShoppingBag, iconBg: 'bg-pink-light', iconColor: 'text-primary' },
  confirmed: { icon: ShoppingBag, iconBg: 'bg-pink-light', iconColor: 'text-primary' },
  packaging: { icon: Package, iconBg: 'bg-purple-100', iconColor: 'text-purple-700' },
  enroute: { icon: Bike, iconBg: 'bg-coral-light', iconColor: 'text-secondary' },
  delivered: { icon: CheckCircle, iconBg: 'bg-green-soft', iconColor: 'text-green-text' },
  pickup: { icon: Package, iconBg: 'bg-teal-100', iconColor: 'text-teal-700' },
};

export default function AdminActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('id, customer_name, status, total, placed_at, order_items(name, qty)')
          .order('placed_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const mapped: ActivityItem[] = data.map((order: any) => {
            const iconInfo = statusIconMap[order.status] || statusIconMap['pending'];
            const itemSummary = (order.order_items || [])
              .slice(0, 2)
              .map((i: any) => `${i.name} × ${i.qty}`)
              .join(', ');
            const timeStr = order.placed_at
              ? new Date(order.placed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : '';
            const isNew = ['pending', 'confirmed'].includes(order.status);
            return {
              id: order.id,
              type: order.status,
              icon: iconInfo.icon,
              iconBg: iconInfo.iconBg,
              iconColor: iconInfo.iconColor,
              title: isNew
                ? `New order from ${order.customer_name?.split(' ')[0] || 'Customer'}`
                : `Order ${order.id} ${order.status}`,
              detail: itemSummary || 'No items',
              time: timeStr,
              amount: isNew ? `$${(order.total || 0).toFixed(2)}` : null,
            };
          });
          setActivities(mapped);
        }
      } catch (err) {
        console.error('Activity feed error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden h-full">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-foreground">Recent Activity</h3>
        <span className="text-xs text-muted-foreground font-medium">Today</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No orders yet today</div>
        )}
        {!loading && activities.map((act, idx) => {
          const Icon = act?.icon;
          return (
            <div
              key={act?.id}
              className={`flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30 ${
                idx < activities?.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${act?.iconBg}`}>
                <Icon size={14} className={act?.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{act?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{act?.detail}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{act?.time}</p>
                {act?.amount && (
                  <p className="text-xs font-bold text-green-text font-tabular">{act?.amount}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}