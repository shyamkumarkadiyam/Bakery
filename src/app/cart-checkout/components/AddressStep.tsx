'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CheckoutData } from './CartCheckoutClient';
import { MapPin } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface AddressStepProps {
  data: CheckoutData;
  setData: (d: CheckoutData) => void;
  onNext: () => void;
  onBack: () => void;
}

type AddressForm = CheckoutData['address'];

export default function AddressStep({ data, setData, onNext, onBack }: AddressStepProps) {
  const {mode,date,time}=useCartStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressForm>({ defaultValues: data.address });

  const onSubmit = (values: AddressForm) => {
    setData({ ...data, address: values });
    onNext();
  };

  if (data.deliveryType === 'pickup') {
    return (
      <div className="bg-white rounded-3xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-light flex items-center justify-center">
            <MapPin size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pickup Details</h2>
            <p className="text-muted-foreground text-sm">We&apos;ll have your order ready!</p>
          </div>
        </div>

        <div className="bg-muted rounded-2xl p-5 mb-6">
          <p className="font-bold text-foreground mb-1">Lolita Bakery Kitchen</p>
          <p className="text-sm text-muted-foreground">Miami, FL — Exact address shared after order confirmation</p>
          <p data-testid="address-pickup-time" className="text-sm text-muted-foreground mt-1">{mode==='later'?`Scheduled: ${date} at ${time}`:'Ready in: 15–20 minutes'}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Your Name <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="pickup-name"
              {...register('name', { required: 'Name is required' })}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Maria Gonzalez"
            />
            {errors.name && <p data-testid="pickup-name-error" role="alert" className="text-red-text text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Phone Number <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="pickup-phone"
              {...register('phone', { required: 'Phone is required' })}
              type="tel"
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="(305) 555-0100"
            />
            {errors.phone && <p data-testid="pickup-phone-error" role="alert" className="text-red-text text-xs mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button data-testid="pickup-back" onClick={onBack} className="btn-outline flex-1 py-3.5 text-sm">← Back</button>
          <button data-testid="pickup-continue" onClick={handleSubmit(onSubmit)} className="btn-primary flex-1 py-3.5 text-sm">
            Continue to Payment →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-pink-light flex items-center justify-center">
          <MapPin size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Delivery Address</h2>
          <p className="text-muted-foreground text-sm">Where should we bring your bites?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Full Name <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="delivery-name"
              {...register('name', { required: 'Name is required' })}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Maria Gonzalez"
            />
            {errors.name && <p className="text-red-text text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Phone <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="delivery-phone"
              {...register('phone', { required: 'Phone is required' })}
              type="tel"
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="(305) 555-0100"
            />
            {errors.phone && <p className="text-red-text text-xs mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">
            Street Address <span className="text-red-text">*</span>
          </label>
          <input
            data-testid="delivery-street"
            {...register('street', { required: 'Street address is required' })}
            className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="1234 Brickell Ave"
          />
          {errors.street && <p className="text-red-text text-xs mt-1">{errors.street.message}</p>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Apt / Unit</label>
            <input
              data-testid="delivery-apt"
              {...register('apt')}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Apt 4B"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              City <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="delivery-city"
              {...register('city', { required: 'City is required' })}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Miami"
            />
            {errors.city && <p className="text-red-text text-xs mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              ZIP <span className="text-red-text">*</span>
            </label>
            <input
              data-testid="delivery-zip"
              {...register('zip', { required: 'ZIP required', pattern: { value: /^\d{5}$/, message: '5-digit ZIP' } })}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="33131"
            />
            {errors.zip && <p className="text-red-text text-xs mt-1">{errors.zip.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Delivery Instructions</label>
          <p className="text-xs text-muted-foreground mb-1.5">Gate code, buzzer number, leave at door, etc.</p>
          <textarea
            data-testid="delivery-instructions"
            {...register('instructions')}
            rows={2}
            className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Ring buzzer #4B, leave at door if no answer..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button data-testid="delivery-back" type="button" onClick={onBack} className="btn-outline flex-1 py-3.5 text-sm">
            ← Back
          </button>
          <button data-testid="delivery-continue" type="submit" className="btn-primary flex-1 py-3.5 text-sm">
            Continue to Payment →
          </button>
        </div>
      </form>
    </div>
  );
}