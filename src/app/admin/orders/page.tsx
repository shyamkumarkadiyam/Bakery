import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import OrderManagementClient from '@/app/order-management/components/OrderManagementClient';

export default function AdminOrdersPage() {
  return (
    <AdminLayout title="Orders">
      <OrderManagementClient />
    </AdminLayout>
  );
}
