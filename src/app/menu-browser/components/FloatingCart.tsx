'use client';
import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export default function FloatingCart() {
  const items = useCartStore((s) => s?.items);
  const total = useCartStore((s) => s?.total);
  const count = items?.reduce((a, i) => a + i?.qty, 0);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
      <Link
        href="/cart-checkout"
        className="flex items-center justify-between bg-foreground text-white px-5 py-3.5 rounded-xl shadow-card-lg w-full"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <ShoppingCart size={15} className="text-white" />
          </span>
          <span className="font-sans font-semibold text-sm">{count} item{count !== 1 ? 's' : ''}</span>
        </div>
        <span className="font-sans font-bold text-sm">View Cart · ${total?.toFixed(2)}</span>
      </Link>
    </div>
  );
}