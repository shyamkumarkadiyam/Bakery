'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, RefreshCw, X } from 'lucide-react';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { notifyInventoryChange } from '@/lib/inventory';
import MenuItemCard from './MenuItemCard';
import { BlockedDays } from '@/app/admin/availability/components/BlockedDays';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  alt: string;
  available: boolean;
  popular: boolean;
  badges: string[];
  calories: number | null;
}

const CATEGORIES = [
  { id: 'arepa', label: 'Arepas', emoji: '🫓' },
  { id: 'empanada', label: 'Empanadas', emoji: '🥟' },
  { id: 'patacon', label: 'Patacones', emoji: '🍌' },
  { id: 'cachapa', label: 'Cachapas', emoji: '🌽' },
  { id: 'tequeno', label: 'Tequeños', emoji: '🧀' },
  { id: 'sweet', label: 'Sweets', emoji: '🍮' },
];

const EMPTY_FORM = {
  id: '',
  name: '',
  category: 'arepa',
  price: '',
  description: '',
  image: '',
  alt: '',
  popular: false,
  badges: '',
  calories: '',
  defaultQty: '5',
};

function mapRow(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    image: row.image,
    alt: row.alt,
    available: row.available,
    popular: row.popular,
    badges: row.badges || [],
    calories: row.calories,
  };
}

export default function AdminMenuClient() {
  const [selectedDate,setSelectedDate] = useState('');
  const {data,loading,error,refresh:fetchItems,date} = useAvailability(selectedDate);
  const items = data?.items || [];
  const [filterCat, setFilterCat] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const {error} = await supabase.from('menu_items').delete().eq('id', id).select('id').single();
      if(error) throw error;
      notifyInventoryChange();
      fetchItems();
    } catch (err: any) {
      setSaveError(err.message || 'Could not delete menu item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const itemId = form.id.trim() || `${form.category}-${Date.now()}`;
      const badgesArr = form.badges
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      const { error } = await supabase.from('menu_items').insert({
        id: itemId,
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(form.price) || 0,
        description: form.description.trim(),
        image: form.image.trim(),
        alt: form.alt.trim(),
        available: true,
        default_daily_quantity: Number(form.defaultQty),
        popular: form.popular,
        badges: badgesArr,
        calories: form.calories ? parseInt(form.calories) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select('id').single();

      if (error) {
        setSaveError(error.message);
      } else {
        notifyInventoryChange();
        setForm(EMPTY_FORM);
        setShowAddForm(false);
        fetchItems();
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const filtered = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p data-testid="admin-menu-summary" className="text-sm text-muted-foreground mt-0.5">
            {items.length} items · {items.filter((i) => i.available).length} available
          </p>
          <label className="block text-xs mt-3">Stock date
            <input data-testid="admin-menu-date" disabled={loading} aria-label="Menu stock date" type="date" value={date} onChange={e=>setSelectedDate(e.target.value)} className="block border border-border rounded-lg px-3 py-2 mt-1 bg-white text-sm"/>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="admin-menu-refresh"
            onClick={fetchItems}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg border border-border bg-white"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            data-testid="admin-menu-add"
            onClick={() => { setShowAddForm(true); setSaveError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            Add Item
          </button>
        </div>
      </div>

      {(error || saveError) && <div data-testid="admin-menu-error" role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg text-sm">{saveError || error}</div>}
      {data?.blocked && <div data-testid="admin-menu-closed" role="status" className="text-red-700 bg-red-50 p-3 rounded-lg text-sm">Closed on {date} — {data.reason}. All items are out of stock.</div>}

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white border border-border rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-foreground text-lg">Add New Menu Item</h3>
            <button data-testid="menu-add-close" aria-label="Close add item" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddItem} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Item Name *</label>
              <input
                data-testid="menu-add-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Reina Pepiada"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Category *</label>
              <select
                data-testid="menu-add-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Price ($) *</label>
              <input
                data-testid="menu-add-price"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="9.50"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Calories</label>
              <input
                data-testid="menu-add-calories"
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                placeholder="420"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Description *</label>
              <textarea
                data-testid="menu-add-description"
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of the item..."
                rows={2}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Image URL</label>
              <input
                data-testid="menu-add-image"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Image Alt Text</label>
              <input
                data-testid="menu-add-alt"
                value={form.alt}
                onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Describe the image..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Badges (comma-separated)</label>
              <input
                data-testid="menu-add-badges"
                value={form.badges}
                onChange={(e) => setForm((f) => ({ ...f, badges: e.target.value }))}
                placeholder="⭐ Best Seller, 🌱 Veggie"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  data-testid="menu-add-popular"
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm((f) => ({ ...f, popular: e.target.checked }))}
                  className="accent-primary"
                />
                Mark as Popular
              </label>
            </div>
            <label className="text-xs font-semibold">Default daily quantity
              <input data-testid="menu-add-default-quantity" type="number" min="0" max="100000" step="1" required value={form.defaultQty} onChange={e=>setForm({...form,defaultQty:e.target.value})} className="block mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm"/>
            </label>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                data-testid="menu-add-cancel"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="menu-add-submit"
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          data-testid="admin-menu-filter-all"
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            filterCat === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/10'
          }`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat.id).length;
          return (
            <button
              data-testid={`admin-menu-filter-${cat.id}`}
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterCat === cat.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/10'
              }`}
            >
              {cat.emoji} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Items + Blocked Days */}
      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-8">
        <section className="min-w-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  date={date}
                  closed={!!data?.blocked}
                  onError={setSaveError}
                  onChanged={fetchItems}
                  onDelete={deleteItem}
                  deleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-semibold">No items in this category</p>
            </div>
          )}
        </section>

        <BlockedDays selectedDate={date} onDateChange={setSelectedDate} ready={!loading} onError={setSaveError} />
      </div>
    </div>
  );
}
