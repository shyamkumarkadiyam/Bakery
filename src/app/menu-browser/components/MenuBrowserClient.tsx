'use client';
import { useState, useEffect } from 'react';
import { Search,RefreshCw } from 'lucide-react';
import MenuItemCard from './MenuItemCard';
import FloatingCart from './FloatingCart';
import { SchedulePicker } from '@/components/SchedulePicker';
import { useCartStore } from '@/store/cartStore';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { dateLabel } from '@/lib/inventory';

const categories = ['all','arepa','empanada','patacon','cachapa','tequeno','sweet'];
const labels = ['All dishes','Arepas','Empanadas','Patacones','Cachapas','Tequeños','Sweets'];
export default function MenuBrowserClient() {
  const [category,setCategory]=useState('all'); const [search,setSearch]=useState('');
  useEffect(()=>{const c=new URLSearchParams(window.location.search).get('category');if(c&&categories.includes(c))setCategory(c);},[]);
  const mode=useCartStore(s=>s.mode); const selectedDate=useCartStore(s=>s.date);
  const setSchedule=useCartStore(s=>s.setSchedule); const hydrated=useCartStore(s=>s.hydrated);
  useEffect(()=>{ if(hydrated) setSchedule({mode:'now'}); },[hydrated,setSchedule]);
  const {data,error,loading,refresh,date}=useAvailability(mode==='later'?selectedDate:undefined);
  const filtered=data?.items.filter(i=>(category==='all'||i.category===category)&&`${i.name} ${i.description}`.toLowerCase().includes(search.toLowerCase()))||[];
  return <div className="pt-14 pb-28 md:pb-8 min-h-screen bg-background">
    <header className="bg-white border-b border-border px-4 lg:px-8 py-6">
      <div className="max-w-screen-xl mx-auto flex flex-wrap gap-6 justify-between items-start">
        <div className="min-w-0"><h1 className="font-bold text-3xl">Our Menu</h1><p data-testid="customer-menu-date" className="text-muted-foreground text-sm mt-2">Fresh for {dateLabel(date)}</p>
          <div className="relative mt-4"><Search size={15} className="absolute left-3 top-3 text-muted-foreground"/>
            <input data-testid="menu-search" aria-label="Search menu" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the menu…" className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm"/>
          </div>
        </div>
        <SchedulePicker prefix="menu-schedule"/>
      </div>
    </header>
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-5">
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="Menu categories">{categories.map((c,i)=><button key={c} data-testid={`menu-category-${c}`} onClick={()=>setCategory(c)} aria-pressed={category===c} className={`text-sm px-3 py-2 rounded-lg transition-colors ${category===c?'bg-primary text-white':'bg-white border border-border hover:bg-muted'}`}>{labels[i]}</button>)}</nav>
      {error && <div role="alert" data-testid="menu-load-error" className="text-red-700 bg-red-50 rounded-lg p-3 mb-4 flex gap-3 items-center flex-wrap">Unable to load availability: {error}<button data-testid="menu-retry" onClick={refresh} className="underline flex items-center gap-1"><RefreshCw size={14}/>Retry</button></div>}
      {data?.blocked && <div role="status" data-testid="customer-menu-closed" className="text-red-800 bg-red-50 border-l-4 border-red-500 p-4 mb-5"><strong>Closed on {dateLabel(date)}</strong><p className="text-sm">{data.reason} · Please choose another date.</p></div>}
      {loading ? <p data-testid="menu-loading" role="status" className="py-16 text-center">Loading menu availability…</p> : <>
        <p data-testid="menu-item-count" className="text-sm text-muted-foreground mb-4">{filtered.length} dishes · {filtered.filter(i=>i.available).length} available</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filtered.map(item=><MenuItemCard key={item.id} item={{...item,available:item.available&&!error}}/>)}</div>
        {!filtered.length && !error && <p data-testid="menu-empty" className="py-12 text-center text-muted-foreground">No dishes match your selection.</p>}
      </>}
    </div><FloatingCart/>
  </div>;
}