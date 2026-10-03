'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, RefreshCw, X, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['all', 'arepa', 'empanada', 'patacon', 'cachapa', 'tequeno', 'sweet', 'breakfast'];

interface Offer {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  badge: string;
  badge_color: string;
  active: boolean;
  sort: number;
}

const EMPTY = { title: '', description: '', image: '', category: 'all', badge: '', badge_color: '#7a2a3a', active: true };

export default function AdminOffersClient() {
  const supabase = createClient();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const uploadImage = async (file: File) => {
    setUploading(true); setError('');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('offer-images').upload(path, file, { contentType: file.type });
    if (error) { setError(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('offer-images').getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
    toast.success('Image uploaded');
    setUploading(false);
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('special_offers').select('*').order('sort');
    if (error) setError(error.message); else setOffers((data as Offer[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const { error } = await supabase.from('special_offers').insert({ ...form, title: form.title.trim(), sort: offers.length });
    if (error) setError(error.message);
    else { toast.success('Offer added'); setForm(EMPTY); setShowForm(false); load(); }
    setSaving(false);
  };

  const toggle = async (o: Offer) => {
    setBusyId(o.id);
    const { error } = await supabase.from('special_offers').update({ active: !o.active }).eq('id', o.id);
    if (error) toast.error(error.message); else load();
    setBusyId(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this offer? This cannot be undone.')) return;
    setBusyId(id);
    const { error } = await supabase.from('special_offers').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Offer deleted'); load(); }
    setBusyId(null);
  };

  return (
    <div className="space-y-6" data-testid="admin-offers-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{offers.length} offers · {offers.filter(o => o.active).length} active · shown on the homepage</p>
        <div className="flex items-center gap-2">
          <button data-testid="admin-offers-refresh" onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-3 py-2 rounded-lg border border-border bg-white"><RefreshCw size={13} /> Refresh</button>
          <button data-testid="admin-offers-add" onClick={() => { setShowForm(true); setError(''); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"><Plus size={15} /> Add Offer</button>
        </div>
      </div>

      {error && <div data-testid="admin-offers-error" role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={add} className="bg-white border border-border rounded-2xl shadow-card p-6 grid sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between sm:col-span-2">
            <h3 className="font-bold text-lg">New Special Offer</h3>
            <button type="button" data-testid="offer-form-close" aria-label="Close" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Title *
            <input data-testid="offer-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" placeholder="Arepa 2×1 Tuesdays" />
          </label>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Description
            <textarea data-testid="offer-description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Short promo text…" />
          </label>
          <div className="text-xs font-semibold text-muted-foreground sm:col-span-2">
            Image
            <div className="flex flex-col sm:flex-row gap-3 mt-1 items-start">
              {form.image && <img src={form.image} alt="preview" className="w-20 h-20 rounded-lg object-cover border border-border flex-shrink-0" />}
              <div className="flex-1 w-full space-y-2">
                <label data-testid="offer-image-upload-label" className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:border-primary ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload image'}
                  <input data-testid="offer-image-file" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                </label>
                <input data-testid="offer-image" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="block w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="…or paste an image URL" />
              </div>
            </div>
          </div>
          <label className="text-xs font-semibold text-muted-foreground">Links to category
            <select data-testid="offer-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm capitalize">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Badge text
            <input data-testid="offer-badge" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="block w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" placeholder="Every Tuesday" />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Badge color
            <input data-testid="offer-badge-color" type="color" value={form.badge_color} onChange={e => setForm({ ...form, badge_color: e.target.value })} className="block w-full mt-1 h-9 border border-border rounded-lg px-1 py-0.5" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium pt-5">
            <input data-testid="offer-active" type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-primary" /> Active (visible to customers)
          </label>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" data-testid="offer-cancel" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted">Cancel</button>
            <button type="submit" data-testid="offer-submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">{saving ? 'Saving…' : 'Add Offer'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map(o => (
            <div key={o.id} data-testid={`admin-offer-${o.id}`} className={`bg-white border rounded-2xl shadow-card overflow-hidden ${o.active ? 'border-border' : 'border-dashed border-border opacity-70'}`}>
              <div className="relative h-32 bg-muted">
                {o.image ? <img src={o.image} alt={o.title} className="w-full h-full object-cover" /> : null}
                {o.badge && <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: o.badge_color }}>{o.badge}</span>}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm">{o.title}</h4>
                  <span className="text-[10px] font-semibold capitalize bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{o.category}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-3">{o.description}</p>
                <div className="flex items-center gap-2 border-t border-border pt-2">
                  <button data-testid={`offer-toggle-${o.id}`} onClick={() => toggle(o)} disabled={busyId === o.id} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 ${o.active ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {o.active ? <Eye size={13} /> : <EyeOff size={13} />}{o.active ? 'Active' : 'Hidden'}
                  </button>
                  <button data-testid={`offer-delete-${o.id}`} onClick={() => remove(o.id)} disabled={busyId === o.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 ml-auto disabled:opacity-50" title="Delete offer"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <p className="text-sm text-muted-foreground py-10 col-span-full text-center">No offers yet. Add one to show it on the homepage.</p>}
        </div>
      )}
    </div>
  );
}
