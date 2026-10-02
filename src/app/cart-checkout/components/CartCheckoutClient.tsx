'use client';
import React, { useState, useMemo } from 'react';
import { useCartStore } from '@/store/cartStore';
import CartStep from './CartStep';
import AddressStep from './AddressStep';
import PaymentStep from './PaymentStep';
import OrderSuccessStep from './OrderSuccessStep';
import { CheckCircle, ShoppingCart, MapPin, CreditCard } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


const steps = [
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'address', label: 'Delivery', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: CreditCard },
];

export type CheckoutData = {
  deliveryType: 'delivery' | 'pickup';
  address: {
    name: string;
    phone: string;
    street: string;
    apt: string;
    city: string;
    zip: string;
    instructions: string;
  };
  paymentMethod: 'cash' | 'zelle';
};

const defaultData: CheckoutData = {
  deliveryType: 'delivery',
  address: { name: '', phone: '', street: '', apt: '', city: '', zip: '', instructions: '' },
  paymentMethod: 'zelle',
};

export default function CartCheckoutClient() {
  const [step, setStep] = useState(0);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>(defaultData);
  const [orderId, setOrderId] = useState('');
  const [orderError, setOrderError] = useState('');
  const items = useCartStore((s) => s.items);
  const { user } = useAuth();
  // Create client once at component level so the session is stable
  const supabase = React.useMemo(() => createClient(), []);

  const handlePlaceOrder = async () => {
    const id = `LB-${Math.floor(1000 + Math.random() * 9000)}`;

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const deliveryFee = checkoutData.deliveryType === 'delivery' ? 3.5 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    const addressStr = checkoutData.deliveryType === 'pickup' ? 'Pickup'
      : [
          checkoutData.address.street,
          checkoutData.address.apt,
          checkoutData.address.city,
          checkoutData.address.zip,
        ].filter(Boolean).join(', ');

    try {
      // Ensure user_profile exists for authenticated users before inserting order
      if (user?.id) {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || checkoutData.address.name || '',
          phone: checkoutData.address.phone || '',
        }, { onConflict: 'id', ignoreDuplicates: true });
      }

      const { error: orderError } = await supabase.from('orders').insert({
        id,
        user_id: user?.id ?? null,
        customer_name: checkoutData.address.name || user?.user_metadata?.full_name || 'Guest',
        customer_phone: checkoutData.address.phone || '',
        customer_address: addressStr,
        delivery_type: checkoutData.deliveryType,
        payment_method: checkoutData.paymentMethod,
        subtotal: parseFloat(subtotal.toFixed(2)),
        delivery_fee: deliveryFee,
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        status: 'pending',
        notes: checkoutData.address.instructions || '',
        placed_at: new Date().toISOString(),
      });

      if (orderError) {
        console.error('Order insert error:', orderError.message);
        // Still proceed — don't block checkout on DB error
      } else {
        // Insert order items
        const orderItems = items.map((item) => ({
          order_id: id,
          name: item.name,
          qty: item.qty,
          price: item.price,
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
          console.error('Order items insert error:', itemsError.message);
        }

        // Upsert initial status event so customer order-status page shows timeline immediately
        await supabase.rpc('upsert_order_status_event', {
          p_order_id: id,
          p_status: 'pending',
          p_message: 'Order received and awaiting confirmation',
        });
      }
    } catch (err: any) {
      console.error('Checkout error:', err?.message);
    }

    setOrderId(id);
    setStep(3);
  };

  if (step === 3) {
    return <OrderSuccessStep orderId={orderId} deliveryType={checkoutData.deliveryType} />;
  }

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <React.Fragment key={`step-frag-${s.id}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isDone ? 'step-done' : isActive ? 'step-active' : 'step-inactive'
                    }`}
                  >
                    {isDone ? <CheckCircle size={18} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={`text-sm font-semibold hidden sm:block ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-px w-12 sm:w-20 ${idx < step ? 'bg-green-text' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 0 && (
              <CartStep
                items={items}
                onNext={() => setStep(1)}
                data={checkoutData}
                setData={setCheckoutData}
              />
            )}
            {step === 1 && (
              <AddressStep
                data={checkoutData}
                setData={setCheckoutData}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <PaymentStep
                data={checkoutData}
                setData={setCheckoutData}
                items={items}
                onPlace={handlePlaceOrder}
                onBack={() => setStep(1)}
              />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-xl border border-border shadow-card p-5 sticky top-24">
              <h3 className="font-sans font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary" />
                Order Summary
              </h3>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={`summary-${item.id}`} className="flex justify-between items-center text-sm">
                    <span className="font-body text-foreground">
                      {item.name}
                      <span className="text-muted-foreground ml-1">×{item.qty}</span>
                    </span>
                    <span className="font-sans font-semibold text-foreground font-tabular">
                      ${(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {(() => {
                  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
                  const delivery = checkoutData.deliveryType === 'delivery' ? 3.5 : 0;
                  const tax = subtotal * 0.08;
                  return (
                    <>
                      <div className="flex justify-between font-body text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="font-tabular">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-body text-sm text-muted-foreground">
                        <span>Delivery fee</span>
                        <span className="font-tabular">
                          {delivery === 0 ? 'Free' : `$${delivery.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between font-body text-sm text-muted-foreground">
                        <span>Tax (8%)</span>
                        <span className="font-tabular">${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-sans font-bold text-base text-foreground border-t border-border pt-2 mt-2">
                        <span>Total</span>
                        <span className="font-tabular text-primary">
                          ${(subtotal + delivery + tax).toFixed(2)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}