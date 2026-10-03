'use client';
import React from 'react';
import { Order, OrderStatus } from '@/data/ordersData';
import OrderStatusBadge from './OrderStatusBadge';
import { Bike, Package, ChevronRight } from 'lucide-react';
import { scheduleLabel } from '@/lib/inventory';

interface OrderTableProps {
  orders: Order[];
  selectedId: string | null;
  onSelect: (order: Order) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  updatingIds?: Set<string>;
}

const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'packaging',
  packaging: 'enroute',
  enroute: 'delivered',
  delivered: null,
  pickup: null,
  cancelled: null,
};

const nextStatusLabel: Record<OrderStatus, string> = {
  pending: 'Confirm',
  confirmed: 'Start Packaging',
  packaging: 'Mark En Route',
  enroute: 'Mark Delivered',
  delivered: '',
  pickup: '',
  cancelled: '',
};

export default function OrderTable({ orders, selectedId, onSelect, onUpdateStatus, updatingIds }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-border shadow-card p-12 text-center">
        <Package size={40} className="text-muted mx-auto mb-3" />
        <h3 className="font-bold text-foreground mb-1">No orders found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Order ID</div>
        <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer</div>
        <div className="col-span-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Items</div>
        <div className="col-span-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total</div>
        <div className="col-span-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type</div>
        <div className="col-span-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Time</div>
        <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {orders.map((order) => {
          const isSelected = selectedId === order.id;
          const next = nextStatusMap[order.status];
          return (
            <div
              data-testid={`admin-order-row-${order.id}`}
              key={order.id}
              onClick={() => onSelect(order)}
              className={`order-row-hover cursor-pointer transition-colors ${
                isSelected ? 'bg-pink-light border-l-4 border-l-primary' : ''
              }`}
            >
              {/* Desktop Row */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-4 items-center">
                <div className="col-span-2">
                  <span className="font-extrabold text-xs break-all text-primary font-tabular">{order.id}</span>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-sm text-foreground truncate">{order.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-foreground truncate">
                    {order.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {order.items.length} item type{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="col-span-1">
                  <span className="font-extrabold text-sm text-foreground font-tabular">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                    order.type === 'delivery' ? 'bg-coral-light text-secondary' : 'bg-yellow-light text-amber-text'
                  }`}>
                    {order.type === 'delivery' ? <Bike size={10} /> : <Package size={10} />}
                    {order.type === 'delivery' ? 'Delivery' : 'Pickup'}
                  </span>
                </div>
                <div className="col-span-1">
                  <span data-testid={`admin-order-time-${order.id}`} className="text-xs text-muted-foreground font-medium">{order.scheduledFor?scheduleLabel(order.scheduledFor,order.fulfillmentTimezone):order.placedAt}</span>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  {next && (
                    <button
                      data-testid={`admin-order-next-${order.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(order.id, next);
                      }}
                      disabled={updatingIds?.has(order.id)}
                      className="text-[10px] font-bold text-primary bg-pink-light hover:bg-pink-mid px-2 py-1 rounded-full transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingIds?.has(order.id) ? '…' : nextStatusLabel[order.status]}
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Row */}
              <div className="md:hidden px-3 py-3 flex items-center gap-2">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="font-extrabold text-xs break-all text-primary font-tabular">{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="font-semibold text-sm text-foreground truncate">{order.customerName}</p>
                  {order.scheduledFor&&<p data-testid={`admin-order-mobile-time-${order.id}`} className="text-xs text-primary">{scheduleLabel(order.scheduledFor,order.fulfillmentTimezone)}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.items.map((i) => i.name).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-1">
                  <p className="font-extrabold text-sm text-foreground font-tabular">${order.total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{order.placedAt}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}