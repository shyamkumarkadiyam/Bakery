'use client';
import { useState } from 'react';
import { Check, Ban } from 'lucide-react';
import { InventoryItem, updateInventory } from '@/lib/inventory';
export const StockToggle = ({ item, date, closed, onError, prefix }: {
  item: InventoryItem; date: string; closed: boolean; onError: (error: string) => void; prefix: string;
}) => {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true); onError('');
    try { await updateInventory(item.id,date,{ available: !item.available }); }
    catch (e) { onError(e instanceof Error ? e.message : 'Could not update stock'); }
    finally { setBusy(false); }
  };
  return <button data-testid={`${prefix}-toggle-${item.id}`} type="button" onClick={toggle} disabled={busy || closed}
    aria-label={`${item.name}: ${item.available ? 'mark out of stock' : 'make available'}`}
    aria-pressed={item.available} title={closed ? 'Date is closed' : undefined}
    className={`inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${item.available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
    {item.available ? <Check size={14}/> : <Ban size={14}/>}{busy ? 'Saving…' : item.available ? 'Available' : 'Out of Stock'}
  </button>;
};