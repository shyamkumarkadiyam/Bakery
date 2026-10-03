import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminOffersClient from './components/AdminOffersClient';

export default function AdminOffersPage() {
  return (
    <AdminLayout title="Special Offers">
      <AdminOffersClient />
    </AdminLayout>
  );
}
