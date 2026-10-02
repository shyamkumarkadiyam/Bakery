'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Save,
  X,
  RefreshCw,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';

interface StockItem {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  stockQty: number;
  maxQtyPerOrder: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  updatedAt: string;
}

function mapRow(row: any): StockItem {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    category: row.category,
    stockQty: row.stock_qty,
    maxQtyPerOrder: row.max_qty_per_order,
    lowStockThreshold: row.low_stock_threshold,
    isAvailable: row.is_available,
    updatedAt: row.updated_at,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  arepa: 'Arepas',
  empanada: 'Empanadas',
  patacon: 'Patacones',
  cachapa: 'Cachapas',
  tequeno: 'Tequeños',
  sweet: 'Sweets',
};

export default function InventoryClient() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ stockQty: number; maxQtyPerOrder: number; lowStockThreshold: number }>({
    stockQty: 0,
    maxQtyPerOrder: 10,
    lowStockThreshold: 5,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAlert, setFilterAlert] = useState(false);
  const supabase = createClient();

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_stock')
        .select('*')
        .order('category')
        .order('item_name');
      if (!error && data) {
        setItems(data.map(mapRow));
      }
    } catch (err) {
      console.error('Fetch stock error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
    const channel = supabase
      .channel('menu_stock_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_stock' }, () => {
        fetchStock();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStock]);

  const startEdit = (item: StockItem) => {
    setEditingId(item.itemId);
    setEditValues({
      stockQty: item.stockQty,
      maxQtyPerOrder: item.maxQtyPerOrder,
      lowStockThreshold: item.lowStockThreshold,
    });
    setSaveError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError('');
  };

  const saveEdit = async (item: StockItem) => {
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase
        .from('menu_stock')
        .update({
          stock_qty: editValues.stockQty,
          max_qty_per_order: editValues.maxQtyPerOrder,
          low_stock_threshold: editValues.lowStockThreshold,
          is_available: editValues.stockQty > 0,
          updated_at: new Date().toISOString(),
        })
        .eq('item_id', item.itemId);
      if (error) {
        setSaveError(error.message);
      } else {
        setEditingId(null);
        fetchStock();
      }
    } catch (err: any) {
      setSaveError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: StockItem) => {
    try {
      await supabase
        .from('menu_stock')
        .update({ is_available: !item.isAvailable, updated_at: new Date().toISOString() })
        .eq('item_id', item.itemId);
      fetchStock();
    } catch (err) {
      console.error('Toggle availability error:', err);
    }
  };

  const lowStockItems = items.filter((i) => i.stockQty > 0 && i.stockQty <= i.lowStockThreshold);
  const outOfStockItems = items.filter((i) => i.stockQty === 0);

  const filtered = items.filter((item) => {
    const catMatch = filterCategory === 'all' || item.category === filterCategory;
    const alertMatch = !filterAlert || item.stockQty <= item.lowStockThreshold;
    return catMatch && alertMatch;
  });

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category)))];

  const getStockStatus = (item: StockItem) => {
    if (item.stockQty === 0) return 'out';
    if (item.stockQty <= item.lowStockThreshold) return 'low';
    return 'ok';
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap gap-4 items-start">
          <ShieldAlert className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm">Stock Alerts</p>
            <div className="flex flex-wrap gap-3 mt-1">
              {outOfStockItems.length > 0 && (
                <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                  {outOfStockItems.length} out of stock
                </span>
              )}
              {lowStockItems.length > 0 && (
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                  {lowStockItems.length} low stock
                </span>
              )}
            </div>
            {outOfStockItems.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Out of stock: {outOfStockItems.map((i) => i.itemName).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Total Items</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{items.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">In Stock</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">
            {items.filter((i) => i.stockQty > i.lowStockThreshold).length}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Low Stock</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">{lowStockItems.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">{outOfStockItems.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-card flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterCategory === cat
                  ? 'bg-primary text-white' :'bg-muted text-muted-foreground hover:bg-primary/10'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground font-medium">
            <input
              type="checkbox"
              checked={filterAlert}
              onChange={(e) => setFilterAlert(e.target.checked)}
              className="accent-primary"
            />
            Low stock only
          </label>
          <button
            onClick={fetchStock}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No items match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Category</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Max/Order</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Alert At</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const status = getStockStatus(item);
                  const isEditing = editingId === item.itemId;
                  return (
                    <tr key={item.itemId} className={`transition-colors ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{item.itemName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editValues.stockQty}
                            onChange={(e) => setEditValues((v) => ({ ...v, stockQty: parseInt(e.target.value) || 0 }))}
                            className="w-20 border border-border rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className={`font-bold text-base ${
                            status === 'out' ? 'text-red-500' :
                            status === 'low'? 'text-amber-500' : 'text-green-600'
                          }`}>
                            {item.stockQty}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editValues.maxQtyPerOrder}
                            onChange={(e) => setEditValues((v) => ({ ...v, maxQtyPerOrder: parseInt(e.target.value) || 1 }))}
                            className="w-20 border border-border rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-foreground font-medium">{item.maxQtyPerOrder}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editValues.lowStockThreshold}
                            onChange={(e) => setEditValues((v) => ({ ...v, lowStockThreshold: parseInt(e.target.value) || 1 }))}
                            className="w-20 border border-border rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-muted-foreground">{item.lowStockThreshold}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            !item.isAvailable
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : status === 'low' ?'bg-amber-100 text-amber-700 hover:bg-amber-200' :'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title="Click to toggle availability"
                        >
                          {!item.isAvailable ? (
                            <><X size={11} /> Unavailable</>
                          ) : status === 'low' ? (
                            <><AlertTriangle size={11} /> Low Stock</>
                          ) : (
                            <><CheckCircle size={11} /> Available</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => saveEdit(item)}
                              disabled={saving}
                              className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              <Save size={12} />
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1 bg-muted text-muted-foreground px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted/80 transition-colors"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="flex items-center gap-1 mx-auto text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {saveError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-xs">
            {saveError}
          </div>
        )}
      </div>

      {/* Low Stock Detail */}
      {lowStockItems.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-amber-500" />
            <h3 className="font-bold text-foreground text-sm">Low Stock Items — Restock Soon</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-foreground truncate mr-2">{item.itemName}</span>
                <span className="text-xs font-bold text-amber-600 flex-shrink-0">
                  {item.stockQty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
