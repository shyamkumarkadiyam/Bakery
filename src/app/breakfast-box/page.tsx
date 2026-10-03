import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import BreakfastBoxBuilderClient from './components/BreakfastBoxBuilderClient';

export default function BreakfastBoxPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <BreakfastBoxBuilderClient />
    </div>
  );
}
