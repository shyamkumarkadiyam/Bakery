'use client';
import React, { useState } from 'react';
import { CreditCard, DollarSign, Smartphone} from 'lucide-react';
import { CheckoutData } from './CartCheckoutClient';
import { CartItem } from '@/store/cartStore';
import Icon from '@/components/ui/AppIcon';


interface PaymentStepProps {
  data: CheckoutData;
  setData: (d: CheckoutData) => void;
  items: CartItem[];
  onPlace: () => void;
  onBack: () => void;
}

const paymentMethods = [
  {
    id: 'zelle' as const,
    label: 'Zelle',
    icon: Smartphone,
    description: 'Send to hola@lolitabakery.com',
  },
  {
    id: 'cash' as const,
    label: 'Cash on Delivery',
    icon: DollarSign,
    description: 'Pay when your order arrives',
  },
];

export default function PaymentStep({ data, setData, items, onPlace, onBack }: PaymentStepProps) {
  const [placing, setPlacing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = data.deliveryType === 'delivery' ? 3.5 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + delivery + tax;

  const handlePlace = () => {
    setPlacing(true);
    // Backend integration point: process payment and create order
    setTimeout(() => {
      setPlacing(false);
      onPlace();
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Payment Method */}
      <div className="bg-white rounded-3xl border border-border shadow-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          Payment Method
        </h2>

        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = data.paymentMethod === method.id;
            return (
              <button
                key={`payment-${method.id}`}
                onClick={() => setData({ ...data, paymentMethod: method.id })}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-pink-light' :'border-border bg-white hover:border-primary/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-primary' : 'border-border'
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        {data.paymentMethod === 'zelle' && (
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-blue-800 mb-1">Zelle Instructions</p>
            <p className="text-xs text-blue-700">
              After placing your order, send payment to{' '}
              <span className="font-bold">hola@lolitabakery.com</span> via Zelle.
              Include your order ID in the memo. Your order will be confirmed once payment is received.
            </p>
          </div>
        )}
      </div>

      {/* Order Review */}
      <div className="bg-white rounded-3xl border border-border shadow-card p-6">
        <h3 className="font-bold text-foreground mb-4">Order Review</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={`review-${item.id}`} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.name} <span className="text-muted-foreground">×{item.qty}</span>
              </span>
              <span className="font-bold font-tabular">${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-tabular">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Delivery</span>
            <span className="font-tabular">{delivery === 0 ? 'Free (Pickup)' : `$${delivery.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax (8%)</span>
            <span className="font-tabular">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-foreground pt-2 border-t border-border mt-2">
            <span>Total</span>
            <span className="text-primary font-tabular">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onBack} className="btn-outline flex-1 py-3.5 text-sm">
            ← Back
          </button>
          <button
            onClick={handlePlace}
            disabled={placing}
            className={`btn-primary flex-1 py-3.5 text-sm flex items-center justify-center gap-2 ${placing ? 'opacity-80' : ''}`}
          >
            {placing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Placing Order...
              </>
            ) : (
              `Place Order • $${total.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}