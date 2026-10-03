'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Availability, bakeryToday } from '@/lib/inventory';

// This clock only updates the visible 'today' selection. Daily stock is resolved
// by PostgreSQL per date, never reset by a browser timer or background worker.
export function useBakeryToday() {
  const [today, setToday] = useState(bakeryToday);
  useEffect(() => {
    const tick = () => setToday(bakeryToday());
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  return today;
}

export function useAvailability(date?: string) {
  const today = useBakeryToday();
  const target = date || today;
  const [data, setData] = useState<Availability | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await createClient().rpc('menu_availability', { p_date: target });
      if (id !== request.current) return;
      if (result.error) throw new Error(result.error.message);
      setData(result.data as Availability); setError('');
    } catch (e) {
      if (id === request.current) setError(e instanceof Error ? e.message : 'Unable to load stock. Please retry.');
    } finally { if (id === request.current) setLoading(false); }
  }, [target]);
  useEffect(() => {
    setLoading(true); void refresh();
    const supabase = createClient();
    const channel = supabase.channel(`inventory-${crypto.randomUUID()}`);
    ['menu_items', 'availability_rules', 'blocked_dates', 'bakery_settings'].forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    });
    channel.subscribe((status: string) => { if (status === 'SUBSCRIBED') void refresh(); });
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('inventory-changed', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      ++request.current; void supabase.removeChannel(channel);
      window.removeEventListener('inventory-changed', refresh);
      window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const current = data?.date === target;
  return { data: current ? data : null, error, loading: !error && (loading || !current), refresh, today, date: target };
}