'use client';
import { useState } from 'react';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { InventoryEditor } from './InventoryEditor';
import { BlockedDays } from './BlockedDays';
import { dateLabel } from '@/lib/inventory';

export default function AvailabilityClient() {
  const [selectedDate,setSelectedDate] = useState('');
  const [search,setSearch] = useState('');
  const [actionError,setActionError] = useState('');
  const { data,loading,error,refresh,today,date } = useAvailability(selectedDate);
  const items = data?.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) || [];
  return <div className="space-y-7" data-testid="availability-panel">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <label className="text-sm font-semibold min-w-0">
        <span className="flex items-center gap-2 mb-2"><CalendarDays size={16}/>Stock date</span>
        <input data-testid="availability-date" disabled={loading} aria-label="Stock date" type="date" value={date} onChange={e=>setSelectedDate(e.target.value)}
          className="border border-border rounded-lg bg-white p-2 text-sm max-w-full"/>
      </label>
      <div className="flex flex-wrap gap-3 items-center">
        <button data-testid="availability-today" onClick={()=>setSelectedDate('')} className="text-primary text-sm hover:underline">Today</button>
        <button data-testid="availability-refresh" onClick={refresh} aria-label="Refresh availability" className="p-2 hover:bg-muted rounded-lg"><RefreshCw size={16}/></button>
        <span data-testid="availability-timezone" className="text-xs text-muted-foreground">{data?.timezone}</span>
      </div>
    </div>
    {(error || actionError) && <div role="alert" data-testid="availability-error" className="text-red-700 bg-red-50 rounded-lg p-3 text-sm">{actionError || error}</div>}
    {data?.blocked && <div role="status" data-testid="availability-closed" className="bg-red-50 border-l-4 border-red-500 p-4 text-red-800 text-sm">
      <strong>{dateLabel(date)} — Closed</strong><p>{data.reason} · All items are out of stock for this date.</p>
    </div>}
    <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-8">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold" data-testid="availability-date-heading">{date === today ? 'Today’s stock' : dateLabel(date)}</h2>
          <input data-testid="availability-search" aria-label="Search stock items" placeholder="Search items…" value={search} onChange={e=>setSearch(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-52"/>
        </div>
        <div data-testid="availability-summary" className="text-sm text-muted-foreground mb-4">{data?.items.length || 0} menu items · {data?.items.filter(i=>i.available).length || 0} available</div>
        {loading ? <p data-testid="availability-loading" role="status">Loading stock…</p> : <div className="grid md:grid-cols-2 gap-4">
          {items.map(item=><InventoryEditor key={`${date}-${item.id}`} item={item} date={date} closed={!!data?.blocked} onError={setActionError}/>)}
        </div>}
        {!loading && !items.length && !error && <p data-testid="availability-empty" className="text-muted-foreground text-sm py-10">No menu items found.</p>}
      </section>
      <BlockedDays selectedDate={date} onDateChange={setSelectedDate} ready={!loading} onError={setActionError}/>
    </div>
  </div>;
}