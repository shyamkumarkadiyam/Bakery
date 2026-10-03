'use client';
import React, { useState } from 'react';
import { Order, OrderStatus } from '@/data/ordersData';
import OrderStatusBadge from './OrderStatusBadge';
import { X, Phone, MapPin, Clock, Package, MessageSquare, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleLabel } from '@/lib/inventory';

interface OrderDetailPanelProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

const allStatuses: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'enroute', label: 'En Route' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'pickup', label: 'Pickup Ready' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrderDetailPanel({ order, onClose, onUpdateStatus }: OrderDetailPanelProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const handleStatusChange = (newStatus: OrderStatus) => {
    onUpdateStatus(order.id, newStatus);
    setStatusDropdownOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-border shadow-kawaii overflow-hidden xl:sticky xl:top-24 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-pink-light to-white">
        <div>
          <p className="text-xs text-muted-foreground font-semibold">Order Details</p>
          <p data-testid="admin-order-detail-id" className="text-sm break-all font-extrabold text-primary font-tabular">{order.id}</p>
        </div>
        <button
          data-testid="admin-order-detail-close"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <p data-testid="admin-order-schedule" className="text-sm font-semibold text-primary">{scheduleLabel(order.scheduledFor,order.fulfillmentTimezone)}</p>
        {/* Status Updater */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
          <div className="relative">
            <button
              data-testid="admin-order-status-select"
              disabled={order.status==='cancelled'}
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-2xl border border-border hover:border-primary/40 transition-colors"
            >
              <OrderStatusBadge status={order.status} />
              <ChevronDown size={15} className={`text-muted-foreground transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-2xl shadow-kawaii z-20 overflow-hidden animate-slide-up">
                {allStatuses.map((s) => (
                  <button
                    data-testid={`admin-order-status-${s.value}`}
                    key={`status-option-${s.value}`}
                    onClick={() => handleStatusChange(s.value)}
                    className={`w-full flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                      order.status === s.value ? 'bg-pink-light font-bold' : 'font-medium'
                    }`}
                  >
                    <OrderStatusBadge status={s.value} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Customer</p>
          <div className="bg-muted rounded-2xl p-4 space-y-2.5">
            <p className="font-bold text-foreground text-sm">{order.customerName}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone size={13} className="text-primary flex-shrink-0" />
              <a href={`tel:${order.customerPhone}`} className="hover:text-primary transition-colors">
                {order.customerPhone}
              </a>
            </div>
            {order.type === 'delivery' && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin size={13} className="text-primary flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{order.customerAddress}</span>
              </div>
            )}
            {order.type === 'pickup' && (
              <div className="flex items-center gap-2 text-sm text-amber-text">
                <Package size={13} className="flex-shrink-0" />
                <span className="font-semibold">Pickup order</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={13} className="text-primary flex-shrink-0" />
              Placed at {order.placedAt}
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Items ({order.items.length})
          </p>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={`detail-item-${order.id}-${idx}`}
                className="flex justify-between items-start text-sm bg-muted rounded-xl px-3 py-2.5"
              >
                <span className="font-semibold text-foreground whitespace-pre-line">
                  {item.name}
                  <span className="text-muted-foreground font-normal ml-1">×{item.qty}</span>
                </span>
                <span className="font-bold text-foreground font-tabular">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pricing</p>
          <div className="bg-muted rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-tabular">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Delivery fee</span>
              <span className="font-tabular">
                {order.deliveryFee === 0 ? 'Free (Pickup)' : `$${order.deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax</span>
              <span className="font-tabular">${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-foreground border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span className="text-primary font-tabular">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Customer Notes
            </p>
            <div className="bg-amber-soft border border-amber-text/20 rounded-2xl p-4 flex gap-2">
              <MessageSquare size={14} className="text-amber-text flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-text leading-relaxed">{order.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}