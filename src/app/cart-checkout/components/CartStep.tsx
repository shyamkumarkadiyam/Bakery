'use client';
import React from 'react';
import AppImage from '@/components/ui/AppImage';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { CartItem, useCartStore } from '@/store/cartStore';
import { CheckoutData } from './CartCheckoutClient';
import Link from 'next/link';

interface CartStepProps {
  items: CartItem[];
  onNext: () => void;
  data: CheckoutData;
  setData: (d: CheckoutData) => void;
}

export default function CartStep({ items, onNext, data, setData }: CartStepProps) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-border shadow-card p-12 text-center">
        <ShoppingBag size={48} className="text-muted mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Add some Venezuelan bites to get started!
        </p>
        <Link href="/menu-browser" className="btn-primary px-8 py-3 inline-block text-sm">
          Browse Menu
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Your Cart 🛒</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {items.reduce((s, i) => s + i.qty, 0)} items
        </p>
      </div>

      {/* Delivery Toggle */}
      <div className="p-6 border-b border-border bg-muted/30">
        <p className="text-sm font-bold text-foreground mb-3">How do you want it?</p>
        <div className="flex gap-3">
          {(['delivery', 'pickup'] as const).map((type) => (
            <button
              key={`delivery-type-${type}`}
              onClick={() => setData({ ...data, deliveryType: type })}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                data.deliveryType === type
                  ? 'border-primary bg-pink-light text-primary' :'border-border bg-white text-muted-foreground hover:border-primary/50'
              }`}
            >
              {type === 'delivery' ? '🛵 Delivery' : '🏠 Pickup'}
            </button>
          ))}
        </div>
        {data.deliveryType === 'delivery' && (
          <p className="text-xs text-muted-foreground mt-2">
            +$3.50 delivery fee • Estimated 25–35 min
          </p>
        )}
        {data.deliveryType === 'pickup' && (
          <p className="text-xs text-muted-foreground mt-2">
            Free pickup • Ready in 15–20 min • Miami, FL
          </p>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={`cart-item-${item.id}`} className="flex gap-4 p-5 items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-muted">
              <AppImage
                src={item.image}
                alt={`${item.name} in cart`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
              <p className="text-primary font-extrabold text-sm font-tabular mt-0.5">
                ${item.price.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.id, item.qty - 1)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-pink-mid transition-colors"
              >
                <Minus size={12} className="text-foreground" />
              </button>
              <span className="w-6 text-center text-sm font-bold font-tabular">{item.qty}</span>
              <button
                onClick={() => updateQty(item.id, item.qty + 1)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-pink-mid transition-colors"
              >
                <Plus size={12} className="text-foreground" />
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="w-7 h-7 rounded-full bg-red-soft flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
              >
                <Trash2 size={12} className="text-red-text" />
              </button>
            </div>
            <div className="text-right min-w-[56px]">
              <p className="font-extrabold text-sm text-foreground font-tabular">
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-muted/20">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
          <span className="font-extrabold text-foreground font-tabular">${subtotal.toFixed(2)}</span>
        </div>
        <button
          onClick={onNext}
          className="w-full btn-primary py-4 text-base"
        >
          Continue to Delivery →
        </button>
        <Link
          href="/menu-browser"
          className="block text-center text-xs text-muted-foreground mt-3 hover:text-primary transition-colors"
        >
          + Add more items
        </Link>
      </div>
    </div>
  );
}