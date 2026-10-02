'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, RefreshCw, X, ImageIcon } from 'lucide-react';

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
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name');
      if (!error && data) {
        setItems(data.map(mapRow));
      }
    } catch (err) {
      console.error('Fetch menu items error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('menu_items_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchItems();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      // Delete availability rules first (cascade should handle it, but be explicit)
      await supabase.from('availability_rules').delete().eq('item_id', id);
      await supabase.from('menu_stock').delete().eq('item_id', id);
      await supabase.from('menu_items').delete().eq('id', id);
      fetchItems();
    } catch (err) {
      console.error('Delete item error:', err);
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
        popular: form.popular,
        badges: badgesArr,
        calories: form.calories ? parseInt(form.calories) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setSaveError(error.message);
      } else {
        // Also add to menu_stock with default availability
        await supabase.from('menu_stock').upsert({
          item_id: itemId,
          item_name: form.name.trim(),
          category: form.category,
          stock_qty: 20,
          max_qty_per_order: 10,
          low_stock_threshold: 5,
          is_available: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id' });

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
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} items · {items.filter((i) => i.available).length} available
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            💡 To set out-of-stock status, use the <strong>Availability</strong> tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchItems}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg border border-border bg-white"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => { setShowAddForm(true); setSaveError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            Add Item
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white border border-border rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-foreground text-lg">Add New Menu Item</h3>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddItem} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Item Name *</label>
              <input
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
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Image Alt Text</label>
              <input
                value={form.alt}
                onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Describe the image..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Badges (comma-separated)</label>
              <input
                value={form.badges}
                onChange={(e) => setForm((f) => ({ ...f, badges: e.target.value }))}
                placeholder="⭐ Best Seller, 🌱 Veggie"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm((f) => ({ ...f, popular: e.target.checked }))}
                  className="accent-primary"
                />
                Mark as Popular
              </label>
            </div>
            {saveError && (
              <div className="sm:col-span-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
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

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-36 bg-muted overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon size={32} />
                  </div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">Out of Stock</span>
                  </div>
                )}
                {item.popular && (
                  <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ Popular
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm text-foreground leading-tight">{item.name}</h4>
                  <span className="font-bold text-sm text-primary flex-shrink-0">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                {item.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.badges.slice(0, 2).map((badge, i) => (
                      <span key={i} className="text-[10px] bg-pink-light text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions — only delete; availability managed in Availability tab */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className={`flex-1 text-center text-xs font-semibold px-2 py-1.5 rounded-lg ${
                    item.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {item.available ? '✓ Available' : '✗ Out of Stock'}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-semibold">No items in this category</p>
        </div>
      )}
    </div>
  );
}
