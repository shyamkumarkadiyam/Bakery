import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import CakeStudioClient from './components/CakeStudioClient';

export default function CakeStudioPage() {
  return (
    <>
      <CustomerNav />
      <main className="min-h-screen bg-[#fdf8f2] pt-14 pb-24 md:pb-8">
        <CakeStudioClient />
      </main>
    </>
  );
}
