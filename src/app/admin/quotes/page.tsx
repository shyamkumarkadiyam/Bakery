import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminQuotesClient from './components/AdminQuotesClient';

export default function AdminQuotesPage() {
  return (
    <AdminLayout title="Cake Quotes">
      <AdminQuotesClient />
    </AdminLayout>
  );
}
