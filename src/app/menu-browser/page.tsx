import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import MenuBrowserClient from '@/app/menu-browser/components/MenuBrowserClient';

export default function MenuBrowserPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <MenuBrowserClient />
    </div>
  );
}