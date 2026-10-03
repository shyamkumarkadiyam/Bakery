'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import CustomerNav from '@/components/CustomerNav';
import LandingFooter from '@/app/components/LandingFooter';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, Clock, FileText, Cake, PartyPopper, ArrowRight } from 'lucide-react';

interface Quote {
  tracking_code: string; customer_name: string; status: string;
  brief: any; inspiration_images: string[]; ai_image_url: string; event_date: string | null;
  quoted_price: number | null; quote_message: string; order_id: string | null;
}

const STAGES = [
  { key: 'requested', label: 'Request Received', icon: FileText, desc: 'We got your cake design' },
  { key: 'quoted', label: 'Quoted', icon: Cake, desc: 'Your personalized price is ready' },
  { key: 'accepted', label: 'Order Placed', icon: PartyPopper, desc: 'Your cake is on its way to the kitchen' },
];

function stageIndex(status: string) {
  if (status === 'requested') return 0;
  if (status === 'quoted') return 1;
  if (status === 'accepted') return 2;
  return 0;
}

export default function CakeTrackingPage() {
  const params = useParams();
  const code = decodeURIComponent(String(params.code || '')).toUpperCase();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc('track_cake', { p_code: code });
    if (!data) { setNotFound(true); } else { setQuote(data as Quote); }
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const accept = async () => {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('accept_cake_quote', { p_code: code });
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success('Order placed! 🎉');
    window.location.href = `/order-status/${(data as { order_id: string }).order_id}`;
  };

  const decline = async () => {
    if (!confirm('Decline this quote? This cannot be undone.')) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc('decline_cake_quote', { p_code: code });
    toast.success('Quote declined.');
    await load();
    setBusy(false);
  };

  const idx = quote ? stageIndex(quote.status) : 0;
  const declined = quote?.status === 'declined';

  return (
    <div className="min-h-screen bg-[#fdf8f2]">
      <CustomerNav />
      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto" data-testid="cake-tracking-page">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h1 className="font-sans font-extrabold text-xl text-foreground mb-2">Cake not found</h1>
            <p className="text-sm text-muted-foreground mb-5">We couldn’t find a cake with tracking number <b>{code}</b>.</p>
            <Link href="/track-order" className="text-primary font-semibold underline">Try another number</Link>
          </div>
        ) : quote && (
          <>
            <div className="text-center py-6">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Custom Cake</p>
              <h1 className="font-sans font-extrabold text-2xl text-foreground mt-1">{quote.tracking_code}</h1>
              <p className="text-sm text-muted-foreground mt-1">Hi {quote.customer_name}, here’s your cake journey.</p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-[#f0e0e8] shadow-card p-5" data-testid="cake-timeline">
              {STAGES.map((s, i) => {
                const done = !declined && i < idx;
                const active = !declined && i === idx;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex gap-3 pb-6 last:pb-0 relative">
                    {i < STAGES.length - 1 && <div className={`absolute left-[18px] top-9 bottom-0 w-0.5 ${done ? 'bg-primary' : 'bg-border'}`} />}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${done ? 'bg-primary text-white' : active ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <Check size={16} /> : <Icon size={16} />}
                    </div>
                    <div className="pt-1">
                      <p className={`font-bold text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {declined && <p data-testid="cake-declined" className="text-center text-sm text-red-600 mt-4">This quote was declined. Start a new design anytime in the Cake Studio.</p>}

            {/* Quote card */}
            {quote.status === 'quoted' && quote.quoted_price != null && (
              <div className="bg-white rounded-2xl border border-[#FFCDD5] shadow-card p-5 mt-5 text-center" data-testid="cake-quote-card">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Your Quote</p>
                <p className="text-3xl font-extrabold text-foreground my-2">${quote.quoted_price.toFixed(2)}</p>
                {quote.quote_message && <p className="text-sm text-muted-foreground mb-4 italic">“{quote.quote_message}”</p>}
                <button data-testid="cake-place-order" onClick={accept} disabled={busy} className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  Place Order <ArrowRight size={16} />
                </button>
                <button data-testid="cake-decline" onClick={decline} disabled={busy} className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-red-600">Decline quote</button>
              </div>
            )}

            {quote.status === 'requested' && (
              <div className="bg-[#FFF0F3] rounded-2xl p-5 mt-5 text-center border border-[#FFCDD5]">
                <Clock size={22} className="text-primary mx-auto mb-2" />
                <p className="text-sm text-foreground font-semibold">We’re reviewing your design</p>
                <p className="text-xs text-muted-foreground mt-1">You’ll see your personalized price here soon. Check back shortly.</p>
              </div>
            )}

            {quote.status === 'accepted' && quote.order_id && (
              <div className="bg-[#FFF0F3] rounded-2xl p-5 mt-5 text-center border border-[#FFCDD5]">
                <PartyPopper size={22} className="text-primary mx-auto mb-2" />
                <p className="text-sm text-foreground font-semibold">Order placed!</p>
                <Link href={`/order-status/${quote.order_id}`} data-testid="cake-view-order" className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm mt-2 underline">
                  View order {quote.order_id} <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Design preview */}
            {(quote.ai_image_url || (quote.inspiration_images?.length > 0)) && (
              <div className="bg-white rounded-2xl border border-[#f0e0e8] shadow-card p-5 mt-5">
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Your Design</p>
                {quote.ai_image_url && <img src={quote.ai_image_url} alt="AI concept" className="w-full rounded-xl mb-3 max-h-56 object-cover" />}
                {quote.inspiration_images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {quote.inspiration_images.map((u, i) => <img key={i} src={u} alt={`ref ${i}`} className="w-16 h-16 rounded-lg object-cover border border-border" />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
