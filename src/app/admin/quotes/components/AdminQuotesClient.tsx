'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Cake, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Quote {
  id: string; tracking_code: string; customer_name: string; customer_phone: string; customer_email: string;
  brief: any; inspiration_images: string[]; ai_image_url: string; event_date: string | null;
  status: string; quoted_price: number | null; quote_message: string; order_id: string | null; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  expired: 'bg-muted text-muted-foreground',
};

export default function AdminQuotesClient() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Quote | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('cake_quotes').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message); else setQuotes((data as Quote[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const openQuote = (q: Quote) => { setActive(q); setPrice(q.quoted_price ? String(q.quoted_price) : ''); setMessage(q.quote_message || ''); };

  const submitQuote = async () => {
    if (!active) return;
    const p = parseFloat(price);
    if (!p || p <= 0) { toast.error('Enter a valid price.'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_quote_cake', { p_id: active.id, p_price: p, p_message: message });
    if (error) toast.error(error.message);
    else { toast.success(`Quote sent for ${active.tracking_code}`); setActive(null); load(); }
    setSaving(false);
  };

  const b = active?.brief || {};

  return (
    <div className="space-y-5" data-testid="admin-quotes-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{quotes.length} quotes · {quotes.filter(q => q.status === 'requested').length} awaiting a price</p>
        <button data-testid="quotes-refresh" onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-3 py-2 rounded-lg border border-border bg-white"><RefreshCw size={13} /> Refresh</button>
      </div>
      {error && <div className="text-red-700 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden divide-y divide-border">
          {quotes.map((q) => (
            <button key={q.id} data-testid={`quote-row-${q.tracking_code}`} onClick={() => openQuote(q)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-pink-light flex items-center justify-center flex-shrink-0"><Cake size={16} className="text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{q.tracking_code} · {q.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{b && ''}{(q.brief?.occasion?.occasion) || 'Custom'} · {q.brief?.cake?.servings || '?'} servings · {q.customer_phone}</p>
              </div>
              {q.quoted_price != null && <span className="text-sm font-bold text-foreground">${Number(q.quoted_price).toFixed(2)}</span>}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[q.status]}`}>{q.status}</span>
            </button>
          ))}
          {quotes.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">No cake quotes yet.</p>}
        </div>
      )}

      {/* Detail / quote drawer */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActive(null)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="quote-detail">
            <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-foreground">{active.tracking_code}</h3>
              <button onClick={() => setActive(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-semibold">{active.customer_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{active.customer_phone}</p></div>
                {active.customer_email && <div className="col-span-2"><p className="text-xs text-muted-foreground">Email</p><p className="font-semibold">{active.customer_email}</p></div>}
                <div><p className="text-xs text-muted-foreground">Occasion</p><p className="font-semibold">{b.occasion?.occasion || '—'} {b.occasion?.milestone ? `· ${b.occasion.milestone}` : ''}</p></div>
                <div><p className="text-xs text-muted-foreground">Event date</p><p className="font-semibold">{active.event_date || '—'}</p></div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p><b>Cake:</b> {b.cake?.servings} servings · {b.cake?.shape} · {b.cake?.tiers} tier(s)</p>
                <p><b>Flavor:</b> {b.cake?.flavor || '—'} / {b.cake?.filling || '—'} / {b.cake?.frosting || '—'}</p>
                <p><b>Look:</b> {b.design?.style || '—'} · {(b.design?.decorations || []).join(', ') || 'no decorations'}</p>
                {b.design?.inscription && <p><b>Message:</b> “{b.design.inscription}”</p>}
                {b.inspiration?.mustHave && <p><b>Must have:</b> {b.inspiration.mustHave}</p>}
                {b.inspiration?.dontWant && <p><b>Avoid:</b> {b.inspiration.dontWant}</p>}
                {(b.inspiration?.extraNotes || b.notes) && <p><b>Notes:</b> {b.inspiration?.extraNotes} {b.notes}</p>}
              </div>
              {active.ai_image_url && <img src={active.ai_image_url} alt="AI concept" className="w-full rounded-xl max-h-52 object-cover" />}
              {active.inspiration_images?.length > 0 && (
                <div className="flex gap-2 flex-wrap">{active.inspiration_images.map((u, i) => <img key={i} src={u} alt={`ref ${i}`} className="w-16 h-16 rounded-lg object-cover border border-border" />)}</div>
              )}

              {active.status === 'accepted' ? (
                <div className="bg-green-50 text-green-700 rounded-xl p-3 text-sm">Placed as order <b>{active.order_id}</b>. Manage it under Orders.</div>
              ) : active.status === 'declined' ? (
                <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">Customer declined this quote.</div>
              ) : (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="font-bold text-foreground">{active.status === 'quoted' ? 'Update quote' : 'Send a quote'}</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input data-testid="quote-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="w-full pl-7 pr-3 py-2.5 border border-border rounded-lg text-sm" />
                    </div>
                  </div>
                  <textarea data-testid="quote-message" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to the customer (optional)" className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none" />
                  <button data-testid="quote-send" onClick={submitQuote} disabled={saving} className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? 'Sending…' : <>Send Quote <ArrowRight size={15} /></>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
