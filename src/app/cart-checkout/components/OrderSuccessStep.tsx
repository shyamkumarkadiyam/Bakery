'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, MapPin, Package } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface OrderSuccessStepProps {
  orderId: string;
  deliveryType: 'delivery' | 'pickup';
}

export default function OrderSuccessStep({ orderId, deliveryType }: OrderSuccessStepProps) {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-slide-up">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-green-soft flex items-center justify-center mx-auto shadow-kawaii">
          <CheckCircle size={48} className="text-green-text" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">
            Order Placed! 🎉
          </h1>
          <p className="text-muted-foreground">
            Lolita is already heating up the kitchen for you! 🌸
          </p>
        </div>

        {/* Order ID */}
        <div className="bg-white border border-border rounded-3xl p-5 shadow-card">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
            Order ID
          </p>
          <p className="text-2xl font-extrabold text-primary font-tabular">{orderId}</p>
          <p className="text-xs text-muted-foreground mt-1">Save this for tracking</p>
        </div>

        {/* ETA */}
        <div className="bg-white border border-border rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-pink-light flex items-center justify-center">
              <Clock size={16} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-medium">Estimated Time</p>
              <p className="font-bold text-foreground text-sm">
                {deliveryType === 'delivery' ? '25–35 minutes' : '15–20 minutes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-coral-light flex items-center justify-center">
              {deliveryType === 'delivery' ? (
                <MapPin size={16} className="text-secondary" />
              ) : (
                <Package size={16} className="text-secondary" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-medium">
                {deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
              </p>
              <p className="font-bold text-foreground text-sm">
                {deliveryType === 'delivery' ?'To your address' :'Lolita Bakery Kitchen, Miami FL'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href={`/order-status/${orderId}`}
            className="block w-full btn-primary py-4 text-base"
          >
            Track My Order 📍
          </Link>
          <Link href="/" className="block w-full btn-outline py-4 text-base">
            Back to Home 🏠
          </Link>
          <Link
            href="/menu-browser"
            className="block w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
          >
            Order More Food 🍽️
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Questions? Text us at (305) 555-0192 or DM on Instagram
        </p>
      </div>
    </div>
  );
}