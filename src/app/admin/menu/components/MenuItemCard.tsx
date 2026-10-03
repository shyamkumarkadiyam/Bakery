'use client';
import { useState } from 'react';
import { Trash2, ImageIcon, Pencil, RotateCcw, Save, X, Check, Ban } from 'lucide-react';
import { InventoryItem, updateInventory } from '@/lib/inventory';
import { createClient } from '@/lib/supabase/client';

export default function MenuItemCard({ item, date, closed, onError, onChanged, onDelete, deleting }: {
  item: InventoryItem;
  date: string;
  closed: boolean;
  onError: (e: string) => void;
  onChanged: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ defaultQty: '', quota: '', maxQty: '', threshold: '' });

  const toggle = async () => {
    setBusy(true); onError('');
    try { await updateInventory(item.id, date, { available: !item.available }); onChanged(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Could not update stock'); }
    finally { setBusy(false); }
  };

  const startEdit = () => {
    setDraft({
      defaultQty: String(item.default_daily_quantity),
      quota: item.has_override ? String(item.daily_limit) : '',
      maxQty: String(item.max_qty_per_order),
      threshold: String(item.low_stock_threshold),
    });
    setEditing(true); onError('');
  };

  const save = async (reset = false) => {
    setBusy(true); onError('');
    try {
      await updateInventory(item.id, date, reset ? { reset: true } : {
        default_daily_quantity: Number(draft.defaultQty),
        daily_limit: draft.quota === '' ? null : Number(draft.quota),
        max_qty_per_order: Number(draft.maxQty),
        low_stock_threshold: Number(draft.threshold),
      });
      setEditing(false); onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : 'Unable to save quantities'); }
    finally { setBusy(false); }
  };

  const setBoxRole = async (role: string) => {
    setBusy(true); onError('');
    try {
      const { error } = await createClient().from('menu_items').update({ box_role: role || null }).eq('id', item.id);
      if (error) throw error;
      onChanged();
    } catch { onError('Could not update box role'); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid={`admin-menu-item-${item.id}`} className="bg-white border border-border rounded-2xl shadow-card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-36 bg-muted overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={32} /></div>
        )}
        {!item.available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span data-testid={`admin-menu-out-of-stock-${item.id}`} className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
        {item.popular && (
          <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Popular</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-sm text-foreground leading-tight">{item.name}</h4>
          <span className="font-bold text-sm text-primary flex-shrink-0">${item.price.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>

        <p data-testid={`admin-menu-remaining-${item.id}`} className="text-xs text-muted-foreground mb-3">
          <span className={`font-bold ${item.remaining === 0 ? 'text-red-600' : 'text-green-700'}`}>{item.remaining}</span> available · {item.orders_taken} reserved · quota {item.daily_limit}{!item.has_override && ' (default)'}
        </p>

        {/* BIG Available / Out of Stock toggle */}
        <button
          data-testid={`menu-toggle-${item.id}`}
          type="button"
          onClick={toggle}
          disabled={busy || closed}
          aria-pressed={item.available}
          aria-label={`${item.name}: ${item.available ? 'mark out of stock' : 'make available'}`}
          title={closed ? 'Date is closed' : undefined}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${item.available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
        >
          <span className="flex items-center gap-2">
            {item.available ? <Check size={18} /> : <Ban size={18} />}
            {busy ? 'Saving…' : item.available ? 'Available' : 'Out of Stock'}
          </span>
          <span className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${item.available ? 'bg-green-600' : 'bg-red-500'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${item.available ? 'left-6' : 'left-1'}`} />
          </span>
        </button>

        {/* Breakfast Box role */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium whitespace-nowrap">Box role</span>
          <select
            data-testid={`box-role-${item.id}`}
            value={item.box_role || ''}
            onChange={(e) => setBoxRole(e.target.value)}
            disabled={busy}
            className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1.5 capitalize disabled:opacity-60"
          >
            <option value="">— none —</option>
            <option value="main">Main</option>
            <option value="side">Side</option>
            <option value="drink">Drink</option>
          </select>
        </div>

        {/* Stock editor */}
        {editing ? (
          <form data-testid={`stock-edit-form-${item.id}`} onSubmit={(e) => { e.preventDefault(); void save(); }} className="mt-3 border-t border-border pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'defaultQty', label: 'Daily default', min: 0, required: true },
                { key: 'quota', label: 'Date quota', min: 0, required: false },
                { key: 'maxQty', label: 'Max / order', min: 1, required: true },
                { key: 'threshold', label: 'Low stock at', min: 0, required: true },
              ] as const).map((f) => (
                <label key={f.key} className="text-[11px] font-medium min-w-0">{f.label}
                  <input data-testid={`stock-${f.key}-${item.id}`} aria-label={`${item.name} ${f.label}`} type="number" min={f.min} max={100000} step={1} required={f.required}
                    value={draft[f.key]} placeholder={f.key === 'quota' ? 'Use default' : undefined}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="block w-full min-w-0 border border-border rounded-lg p-1.5 mt-1 text-sm" />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button data-testid={`stock-save-${item.id}`} disabled={busy} type="submit" className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs flex gap-1 items-center disabled:opacity-50"><Save size={13} />{busy ? 'Saving…' : 'Save'}</button>
              <button data-testid={`stock-cancel-${item.id}`} disabled={busy} type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs flex gap-1 items-center hover:bg-muted"><X size={13} />Cancel</button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <button data-testid={`stock-edit-${item.id}`} onClick={startEdit} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary border border-border rounded-lg px-3 py-1.5"><Pencil size={13} />Edit stock</button>
            {(item.has_override || item.is_blocked) && (
              <button data-testid={`stock-reset-${item.id}`} disabled={busy} onClick={() => save(true)} title="Restore daily default; keep reservations" aria-label={`Reset ${item.name} to default`} className="p-1.5 rounded-lg hover:bg-muted"><RotateCcw size={15} /></button>
            )}
            <button data-testid={`menu-delete-${item.id}`} onClick={() => onDelete(item.id)} disabled={deleting} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto" title="Delete item"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
