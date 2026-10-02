import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import SweetBoxBuilderClient from '@/app/sweet-box-builder/components/SweetBoxBuilderClient';

export default function SweetBoxBuilderPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <SweetBoxBuilderClient />
    </div>
  );
}