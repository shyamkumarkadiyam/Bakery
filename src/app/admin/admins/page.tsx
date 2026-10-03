import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminUsersClient from './components/AdminUsersClient';

export default function AdminUsersPage() {
  return (
    <AdminLayout title="Admins">
      <AdminUsersClient />
    </AdminLayout>
  );
}
