'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { Plus, Minus, Coffee, ShoppingCart, UtensilsCrossed, Croissant, Gift, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { InventoryItem } from '@/lib/inventory';
import { SchedulePicker } from '@/components/SchedulePicker';

type Role = 'main' | 'side' | 'drink';

const SIZES = {
  small: { label: 'Small', counts: { main: 1, side: 1, drink: 1 } },
  medium: { label: 'Medium', counts: { main: 2, side: 2, drink: 2 } },
  large: { label: 'Large', counts: { main: 3, side: 3, drink: 3 } },
} as const;
type SizeKey = keyof typeof SIZES;

const ROLES: { key: Role; label: string; icon: typeof Croissant }[] = [
  { key: 'main', label: 'Mains', icon: Croissant },
  { key: 'side', label: 'Sides', icon: UtensilsCrossed },
  { key: 'drink', label: 'Drinks', icon: Coffee },
];

const OCCASIONS = ['None', 'Birthday', 'Anniversary', 'Thank You', 'Congratulations', 'Get Well Soon', 'Just Because', 'Custom'];

type Sel = Record<Role, Record<string, number>>;
const EMPTY_SEL: Sel = { main: {}, side: {}, drink: {} };

export default function BreakfastBoxBuilderClient() {
  const [size, setSize] = useState<SizeKey>('medium');
  const [sel, setSel] = useState<Sel>(EMPTY_SEL);
  const [occasion, setOccasion] = useState('None');
  const [message, setMessage] = useState('');

  const addBox = useCartStore((s) => s.addBox);
  const cart = useCartStore((s) => s.items);
  const mode = useCartStore((s) => s.mode);
  const date = useCartStore((s) => s.date);
  const setSchedule = useCartStore((s) => s.setSchedule);
  const hydrated = useCartStore((s) => s.hydrated);
  useEffect(() => { if (hydrated) setSchedule({ mode: 'now' }); }, [hydrated, setSchedule]);
  const { data, error, loading } = useAvailability(mode === 'later' ? date : undefined);

  const items = data?.items || [];
  const byRole = useMemo(() => ({
    main: items.filter((i) => i.box_role === 'main'),
    side: items.filter((i) => i.box_role === 'side'),
    drink: items.filter((i) => i.box_role === 'drink'),
  }), [items]);
  const byId = (id: string) => items.find((i) => i.id === id);
  const cartDemand = (id: string) =>
    cart.reduce((n, l) => n + (l.isBox
      ? (l.components?.filter((c) => c.id === id).reduce((s, c) => s + c.qty, 0) || 0) * l.qty
      : (l.id === id ? l.qty : 0)), 0);

  const counts = SIZES[size].counts;
  const roleTotal = (role: Role) => Object.values(sel[role]).reduce((a, b) => a + b, 0);
  const complete = (['main', 'side', 'drink'] as Role[]).every((r) => roleTotal(r) === counts[r]);
  const total = (['main', 'side', 'drink'] as Role[]).reduce((sum, r) =>
    sum + Object.entries(sel[r]).reduce((s, [id, q]) => s + (byId(id)?.price || 0) * q, 0), 0);

  const changeSize = (next: SizeKey) => {
    setSize(next);
    setSel(EMPTY_SEL);
  };

  const add = (role: Role, item: InventoryItem) => {
    if (roleTotal(role) >= counts[role]) {
      toast.error(`${ROLES.find((r) => r.key === role)!.label}: pick exactly ${counts[role]} for a ${SIZES[size].label} box.`);
      return;
    }
    const inCart = cartDemand(item.id);
    const already = sel[role][item.id] || 0;
    const limit = Math.min(item.remaining, item.max_qty_per_order);
    if (!item.available || inCart + already + 1 > limit) {
      toast.error(`Not enough ${item.name} available for this date.`);
      return;
    }
    setSel((prev) => ({ ...prev, [role]: { ...prev[role], [item.id]: already + 1 } }));
  };

  const dec = (role: Role, id: string) => {
    setSel((prev) => {
      const next = { ...prev[role] };
      const q = (next[id] || 0) - 1;
      if (q <= 0) delete next[id]; else next[id] = q;
      return { ...prev, [role]: next };
    });
  };

  const handleAddToCart = () => {
    if (!complete) { toast.error('Complete each section to add your box.'); return; }
    if (error || loading) { toast.error('Availability is still loading. Please retry.'); return; }
    // Final stock re-check using full cart demand
    for (const role of ['main', 'side', 'drink'] as Role[]) {
      for (const [id, q] of Object.entries(sel[role])) {
        const it = byId(id);
        if (!it || !it.available || cartDemand(id) + q > Math.min(it.remaining, it.max_qty_per_order)) {
          toast.error('Some items are no longer available for this date. Please adjust your box.');
          return;
        }
      }
    }
    const components = (['main', 'side', 'drink'] as Role[]).flatMap((role) =>
      Object.entries(sel[role]).map(([id, q]) => ({ id, qty: q, name: byId(id)?.name || '' })));
    const label = `🎁 Venezuelan Breakfast Box (${SIZES[size].label})`
      + (occasion && occasion !== 'None' ? ` — ${occasion}` : '')
      + (message.trim() ? `: "${message.trim()}"` : '');
    addBox({ id: `box-${crypto.randomUUID()}`, name: label, price: total, image: '', category: 'breakfast', isBox: true, boxLabel: label, components });
    setSel(EMPTY_SEL); setOccasion('None'); setMessage('');
    toast.success('Breakfast Box added to cart! 🎁');
  };

  return (
    <div className="pt-14 pb-24 md:pb-8 min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 lg:px-8 py-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-5"><SchedulePicker prefix="box-schedule" /></div>
          {error && <p data-testid="box-stock-error" role="alert" className="text-red-700 mb-4">{error}</p>}
          {data?.blocked && <p data-testid="box-closed" role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg mb-4 text-sm">The bakery is closed on this date. Please choose another date.</p>}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-pink-light flex items-center justify-center"><Gift size={18} className="text-primary" /></div>
            <p className="font-sans text-xs font-semibold text-primary uppercase tracking-widest">Venezuelan Breakfast Box</p>
          </div>
          <h1 className="font-sans font-bold text-2xl text-foreground">Build Your Breakfast Box</h1>
          <p className="font-body text-sm text-muted-foreground mt-1 max-w-lg">Choose a size, then pick your mains, sides and drinks. Perfect for birthdays, anniversaries and every reason to celebrate.</p>

          {/* Size selector */}
          <div className="mt-5 flex flex-wrap gap-3" data-testid="box-size-selector">
            {(Object.keys(SIZES) as SizeKey[]).map((key) => {
              const s = SIZES[key];
              const activeSize = size === key;
              return (
                <button
                  key={key}
                  data-testid={`box-size-${key}`}
                  onClick={() => changeSize(key)}
                  className={`px-4 py-3 rounded-2xl border-2 text-left transition-all ${activeSize ? 'border-primary bg-pink-light' : 'border-border hover:border-primary/40'}`}
                >
                  <span className="block font-bold text-sm text-foreground">{s.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{s.counts.main} main · {s.counts.side} side · {s.counts.drink} drink</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Role sections */}
          <div className="lg:col-span-2 space-y-8">
            {ROLES.map(({ key, label, icon: Icon }) => {
              const roleItems = byRole[key];
              const picked = roleTotal(key);
              const need = counts[key];
              const done = picked === need;
              return (
                <section key={key} data-testid={`box-section-${key}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={18} className="text-primary" />
                    <h2 className="font-sans font-bold text-base text-foreground">{label}</h2>
                    <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`} data-testid={`box-count-${key}`}>
                      {picked}/{need} {done && <Sparkles size={11} className="inline" />}
                    </span>
                  </div>
                  {roleItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">No {label.toLowerCase()} assigned yet. An admin can set box roles under Admin → Menu.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {roleItems.map((item) => {
                        const qty = sel[key][item.id] || 0;
                        const disabledAdd = (!item.available) || (picked >= need && qty === 0);
                        return (
                          <div key={item.id} data-testid={`box-item-${item.id}`} className={`rounded-xl overflow-hidden border-2 bg-white transition-all ${qty > 0 ? 'border-primary shadow-card' : 'border-border'}`}>
                            <div className="relative aspect-square bg-muted">
                              <AppImage src={item.image} alt={item.alt} fill sizes="(max-width:640px) 50vw, 20vw" className="object-cover" />
                              {!item.available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-[11px] font-bold">Out of stock</span></div>}
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-bold text-foreground leading-tight truncate">{item.name}</p>
                              <p className="text-primary font-extrabold text-xs mt-0.5">${item.price.toFixed(2)}</p>
                              <div className="flex items-center justify-between mt-2">
                                {qty > 0 ? (
                                  <button data-testid={`box-dec-${item.id}`} onClick={() => dec(key, item.id)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border"><Minus size={14} /></button>
                                ) : <span className="w-7 h-7" />}
                                <span data-testid={`box-qty-${item.id}`} className="text-sm font-bold font-tabular">{qty}</span>
                                <button data-testid={`box-add-${item.id}`} onClick={() => add(key, item)} disabled={disabledAdd} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/90"><Plus size={14} /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Summary sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-border rounded-3xl shadow-kawaii overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white">
                <div className="flex items-center gap-2 mb-1"><Gift size={18} /><h3 className="font-bold text-base">Your Breakfast Box</h3></div>
                <p className="text-white/85 text-xs">{SIZES[size].label} · {complete ? '🎉 Ready to add!' : 'Fill each section to continue'}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Occasion */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
                  <select data-testid="box-occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm">
                    {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {/* Message */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Personal message (optional)</label>
                  <textarea data-testid="box-message" rows={2} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Happy Birthday, Maria! 🎂" className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm resize-none" />
                </div>

                {/* Section status */}
                <div className="space-y-1.5 border-t border-border pt-3">
                  {ROLES.map(({ key, label }) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={roleTotal(key) === counts[key] ? 'text-green-700 font-bold' : 'text-foreground font-semibold'}>{roleTotal(key)}/{counts[key]}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="text-sm font-semibold text-muted-foreground">Box Total</span>
                  <span data-testid="box-total" className="text-xl font-extrabold text-foreground font-tabular">${total.toFixed(2)}</span>
                </div>

                <button
                  data-testid="box-add-to-cart"
                  onClick={handleAddToCart}
                  disabled={!complete || !!data?.blocked}
                  className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={16} /> {complete ? 'Add Box to Cart' : 'Complete your box'}
                </button>
                <Link href="/menu-browser" className="block text-center text-xs text-muted-foreground mt-1 hover:text-primary transition-colors">Or browse the full menu →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
