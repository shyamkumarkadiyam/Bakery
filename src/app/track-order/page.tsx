'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerNav from '@/components/CustomerNav';
import LandingFooter from '@/app/components/LandingFooter';
import { createClient } from '@/lib/supabase/client';
import { PackageSearch, Search, AlertCircle, ArrowRight, ShoppingBag } from 'lucide-react';

function normalizeOrderNumber(raw: string): string {
  let v = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!v) return v;
  // Strip an existing LB prefix (with or without dash) then re-apply a clean one
  v = v.replace(/^LB-?/, '');
  // Keep only alphanumerics for the tail
  v = v.replace(/[^A-Z0-9]/g, '');
  return v ? `LB-${v}` : '';
}

export default function TrackOrderPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const raw = input.trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) { setError('Please enter your order or cake tracking number.'); return; }

    // Custom cake tracking numbers start with CK-
    if (raw.startsWith('CK')) {
      const code = 'CK-' + raw.replace(/^CK-?/, '').replace(/[^A-Z0-9]/g, '');
      router.push(`/cake-tracking/${code}`);
      return;
    }

    const orderId = normalizeOrderNumber(input);
    if (!orderId) {
      setError('Please enter your order number.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle();

      if (dbError) {
        setError('Something went wrong. Please try again in a moment.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError(`We couldn't find order ${orderId}. Double-check the number and try again.`);
        setLoading(false);
        return;
      }

      router.push(`/order-status/${orderId}`);
    } catch {
      setError('Something went wrong. Please try again in a moment.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f2]">
      <CustomerNav />
      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto" data-testid="track-order-page">
        {/* Header */}
        <div className="flex flex-col items-center py-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#f5e0e8' }}
          >
            <PackageSearch size={36} style={{ color: '#7a2a3a' }} />
          </div>
          <h1 className="font-sans font-extrabold text-2xl" style={{ color: '#1a1a1a' }}>
            Track Your Order
          </h1>
          <p className="font-body text-sm mt-2 max-w-xs" style={{ color: '#6b5a5e' }}>
            No account needed. Just enter the order number from your confirmation to see live status.
          </p>
        </div>

        {/* Track form */}
        <form
          onSubmit={handleTrack}
          className="bg-white rounded-2xl p-6 border border-[#f0e0e8] shadow-card"
          data-testid="track-order-form"
        >
          <label
            htmlFor="order-number"
            className="block text-xs font-semibold mb-1.5"
            style={{ color: '#6b5a5e' }}
          >
            Order Number
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: '#c9a0b0' }}
            />
            <input
              id="order-number"
              data-testid="track-order-input"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. LB-2245"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7a2a3a]/30"
              style={{ borderColor: '#e8d5de', background: '#fdf8f2', color: '#1a1a1a' }}
            />
          </div>

          {error && (
            <div
              className="mt-3 flex items-start gap-2 text-sm text-red-600"
              data-testid="track-order-error"
            >
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="track-order-submit"
            className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#7a2a3a' }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Searching…
              </>
            ) : (
              <>
                Track Order
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Help / sign-in nudge */}
        <div className="mt-6 text-center space-y-3">
          <p className="font-body text-xs" style={{ color: '#6b5a5e' }}>
            Regular orders start with <span className="font-bold">LB-</span>; custom cake quotes start with <span className="font-bold">CK-</span>. Both were shown on your confirmation screen.
          </p>
          <Link
            href="/account"
            data-testid="track-order-signin-link"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: '#7a2a3a' }}
          >
            <ShoppingBag size={14} />
            Have an account? Sign in to see all your orders
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
