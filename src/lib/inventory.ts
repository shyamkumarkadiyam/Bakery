import { createClient } from '@/lib/supabase/client';
import { inventoryErrorMessage } from './inventory-errors';

export interface InventoryItem {
  id: string; name: string; category: string; price: number; description: string;
  image: string; alt: string; popular: boolean; badges: string[]; calories: number | null; box_role: 'main' | 'side' | 'drink' | null;
  default_daily_quantity: number; max_qty_per_order: number; low_stock_threshold: number;
  daily_limit: number; orders_taken: number; remaining: number; available: boolean;
  has_override: boolean; is_blocked: boolean; notes: string;
}
export interface Availability {
  date: string; today: string; timezone: string; blocked: boolean; reason: string | null; items: InventoryItem[];
}
export const bakeryTimezone = process.env.NEXT_PUBLIC_BAKERY_TIMEZONE!;
export function bakeryToday() {
  if (!bakeryTimezone) throw new Error('NEXT_PUBLIC_BAKERY_TIMEZONE is required');
  return new Intl.DateTimeFormat('en-CA', { timeZone: bakeryTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function scheduleLabel(iso?: string | null, timezone?: string | null) {
  return iso ? new Date(iso).toLocaleString('en-US', { timeZone: timezone || bakeryTimezone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'As soon as possible';
}
export function notifyInventoryChange() { window.dispatchEvent(new Event('inventory-changed')); }
export async function updateInventory(itemId: string, date: string, changes: Record<string, unknown>) {
  const { data, error } = await createClient().rpc('set_item_inventory', { p_item_id: itemId, p_date: date, p_changes: changes });
  if (error) throw new Error(inventoryErrorMessage(error));
  notifyInventoryChange();
  return data as Availability;
}
export async function blockDate(date: string, blocked: boolean, reason = 'Closed') {
  const { error } = await createClient().rpc('set_blocked_date', { p_date: date, p_blocked: blocked, p_reason: reason });
  if (error) throw new Error(inventoryErrorMessage(error));
  notifyInventoryChange();
}