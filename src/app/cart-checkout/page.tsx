import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import CartCheckoutClient from '@/app/cart-checkout/components/CartCheckoutClient';

export default function CartCheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <CartCheckoutClient />
    </div>
  );
}