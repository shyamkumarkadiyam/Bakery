import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminDashboardClient from '@/app/admin-dashboard/components/AdminDashboardClient';

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <AdminDashboardClient />
    </AdminLayout>
  );
}
