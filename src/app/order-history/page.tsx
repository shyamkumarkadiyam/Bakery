import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import OrderHistoryClient from './components/OrderHistoryClient';

export default function OrderHistoryPage() {
  return (
    <>
      <CustomerNav />
      <main className="min-h-screen bg-background pt-14 pb-24 md:pb-8">
        <OrderHistoryClient />
      </main>
    </>
  );
}
