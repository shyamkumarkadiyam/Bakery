import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AvailabilityClient from './components/AvailabilityClient';

export default function AdminAvailabilityPage() {
  return (
    <AdminLayout title="Availability">
      <AvailabilityClient />
    </AdminLayout>
  );
}
