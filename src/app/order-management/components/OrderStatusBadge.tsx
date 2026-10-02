import React from 'react';
import { OrderStatus } from '@/data/ordersData';

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  confirmed: { label: 'Confirmed', className: 'status-confirmed' },
  packaging: { label: 'Packaging', className: 'status-packaging' },
  enroute: { label: 'En Route', className: 'status-enroute' },
  delivered: { label: 'Delivered', className: 'status-delivered' },
  pickup: { label: 'Pickup Ready', className: 'status-pickup' },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}