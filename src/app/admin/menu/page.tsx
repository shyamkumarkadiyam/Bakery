import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminMenuClient from './components/AdminMenuClient';

export default function AdminMenuPage() {
  return (
    <AdminLayout title="Menu Management">
      <AdminMenuClient />
    </AdminLayout>
  );
}
