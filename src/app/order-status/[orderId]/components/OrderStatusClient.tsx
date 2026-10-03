'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { scheduleLabel } from '@/lib/inventory';
import { CheckCircle, Clock, MapPin, Package, Truck, Home, RefreshCw, AlertCircle, Phone, ArrowLeft,  } from 'lucide-react';

interface OrderEvent {
  id: string;
  status: string;
  message: string;
  createdAt: string;
}

interface OrderData {
  id: string;
  customerName: string;
  customerAddress: string;
  deliveryType: string;
  status: string;
  total: number;
  placedAt: string;
  scheduledFor?: string | null;
  timezone?: string | null;
  items: { name: string; qty: number; price: number }[];
}

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order Received',  icon: Package,   desc: 'We got your order!' },
  { key: 'confirmed', label: 'Confirmed',        icon: CheckCircle, desc: 'Bakery confirmed' },
  { key: 'packaging', label: 'Preparing',        icon: Clock,     desc: 'Being prepared' },
  { key: 'enroute',   label: 'On the Way',       icon: Truck,     desc: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered',        icon: Home,      desc: 'Enjoy your order!' },
];

const PICKUP_STEPS = [
  { key: 'pending',   label: 'Order Received',  icon: Package,   desc: 'We got your order!' },
  { key: 'confirmed', label: 'Confirmed',        icon: CheckCircle, desc: 'Bakery confirmed' },
  { key: 'packaging', label: 'Preparing',        icon: Clock,     desc: 'Being prepared' },
  { key: 'pickup',    label: 'Ready for Pickup', icon: Home,      desc: 'Come pick it up!' },
];

function getStepIndex(status: string, isPickup: boolean): number {
  const steps = isPickup ? PICKUP_STEPS : STATUS_STEPS;
  const idx = steps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function getETA(status: string, placedAt: string): string {
  const placed = new Date(placedAt);
  const etaMinutes: Record<string, number> = {
    pending: 45,
    confirmed: 40,
    packaging: 30,
    enroute: 15,
    delivered: 0,
    pickup: 0,
  };
  const mins = etaMinutes[status] ?? 45;
  if (mins === 0) return status === 'delivered' ? 'Delivered!' : 'Ready!';
  const eta = new Date(placed.getTime() + mins * 60 * 1000);
  return eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function OrderStatusClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const supabase = createClient();

  const fetchOrder = useCallback(async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(name, qty, price)')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder({
        id: orderData.id,
        customerName: orderData.customer_name,
        customerAddress: orderData.customer_address,
        deliveryType: orderData.delivery_type,
        status: orderData.status,
        total: orderData.total,
        placedAt: orderData.placed_at,
        scheduledFor: orderData.scheduled_for,
        timezone: orderData.fulfillment_timezone,
        items: (orderData.order_items || []).map((i: any) => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
      });

      const { data: eventsData } = await supabase
        .from('order_status_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (eventsData) {
        setEvents(
          eventsData.map((e: any) => ({
            id: e.id,
            status: e.status,
            message: e.message,
            createdAt: e.created_at,
          }))
        );
      }
    } catch (err) {
      console.error('Fetch order status error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    const orderChannel = supabase
      .channel(`order_${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => { fetchOrder(); })
      .subscribe();

    const eventsChannel = supabase
      .channel(`events_${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_status_events',
        filter: `order_id=eq.${orderId}`,
      }, () => { fetchOrder(); })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [fetchOrder, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw size={28} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Loading order status…</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold text-foreground mb-2">Order Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn't find order <span className="font-mono font-bold">{orderId}</span>. Please check your order ID.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors">
            <ArrowLeft size={15} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isPickup = order.deliveryType === 'pickup';
  const steps = isPickup ? PICKUP_STEPS : STATUS_STEPS;
  const currentStepIdx = getStepIndex(order.status, isPickup);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered' || order.status === 'pickup';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            Home
          </Link>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Order</p>
            <p data-testid="tracked-order-id" className="font-bold text-xs break-all text-foreground font-mono">{order.id}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Hero */}
        <div className={`rounded-2xl p-6 text-center ${
          isCancelled ? 'bg-red-50 border border-red-200' : isDelivered ?'bg-green-50 border border-green-200': 'bg-primary/5 border border-primary/20'
        }`}>
          {isCancelled ? (
            <>
              <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold text-red-700">Order Cancelled</h2>
              <p className="text-red-600 text-sm mt-1">This order has been cancelled.</p>
            </>
          ) : isDelivered ? (
            <>
              <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold text-green-700">
                {isPickup ? 'Ready for Pickup!' : 'Delivered!'}
              </h2>
              <p className="text-green-600 text-sm mt-1">
                {isPickup ? 'Your order is ready. Come pick it up!' : 'Enjoy your Lolita Bakery order 🎉'}
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Truck size={22} className="text-primary" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground">
                {steps[currentStepIdx]?.label || 'Processing'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {steps[currentStepIdx]?.desc}
              </p>
            </>
          )}
          {(order.scheduledFor || (!isCancelled&&!isDelivered)) && <div data-testid="tracked-order-schedule" className="mt-4 inline-flex items-center gap-2 bg-white border border-border rounded-lg px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
            <Clock size={14} className="text-primary" />
            {order.scheduledFor ? `Scheduled: ${scheduleLabel(order.scheduledFor,order.timezone)}` : `ETA: ${getETA(order.status,order.placedAt)}`}
          </div>}
        </div>

        {/* Step Progress */}
        {!isCancelled && (
          <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-bold text-foreground text-sm mb-5">Order Progress</h3>
            <div className="relative">
              {/* Progress line */}
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border" />
              <div
                className="absolute left-5 top-5 w-0.5 bg-primary transition-all duration-700"
                style={{ height: `${(currentStepIdx / Math.max(steps.length - 1, 1)) * 100}%` }}
              />
              <div className="space-y-5">
                {steps.map((step, idx) => {
                  const StepIcon = step.icon;
                  const done = idx < currentStepIdx;
                  const active = idx === currentStepIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                        done ? 'bg-primary text-white' : active ?'bg-primary text-white ring-4 ring-primary/20': 'bg-muted text-muted-foreground'
                      }`}>
                        <StepIcon size={16} />
                      </div>
                      <div className="pt-2">
                        <p className={`text-sm font-semibold ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                      {active && (
                        <div className="ml-auto pt-2 flex-shrink-0">
                          <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Current</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Info */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
          <h3 className="font-bold text-foreground text-sm mb-4">
            {isPickup ? 'Pickup Details' : 'Delivery Details'}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {isPickup ? 'Pickup Location' : 'Delivery Address'}
                </p>
                <p className="text-sm text-foreground font-medium">
                  {isPickup ? '1234 Bakery Lane, Miami FL 33101' : order.customerAddress}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package size={16} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Customer</p>
                <p className="text-sm text-foreground font-medium">{order.customerName}</p>
              </div>
            </div>
          </div>

          {/* Map placeholder */}
          {!isPickup && (
            <div className="mt-4 rounded-xl overflow-hidden border border-border bg-muted/40 h-36 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin size={24} className="mx-auto mb-1 opacity-40" />
                <p className="text-xs font-medium">Live map coming soon</p>
                <p className="text-xs opacity-60">{order.customerAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
          <h3 className="font-bold text-foreground text-sm mb-4">Your Order</h3>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <span className="text-foreground whitespace-pre-line">
                  <span className="font-semibold text-primary mr-1.5">{item.qty}×</span>
                  {item.name}
                </span>
                <span className="text-muted-foreground font-medium">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-foreground">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notification Timeline */}
        {events.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-bold text-foreground text-sm mb-4">Notification Timeline</h3>
            <div className="space-y-3">
              {[...events].reverse().map((event, idx) => (
                <div key={event.id} className={`flex gap-3 ${idx === 0 ? 'opacity-100' : 'opacity-70'}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    {idx < events.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-foreground">{event.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-card flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Need help with your order?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Call or text us anytime</p>
          </div>
          <a
            href="tel:+13055550100"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Phone size={14} />
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
}
