'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarX, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { blockDate,dateLabel } from '@/lib/inventory';

export const BlockedDays = ({ selectedDate,onError,onDateChange,ready }: { selectedDate:string; onError:(error:string)=>void; onDateChange:(date:string)=>void; ready:boolean }) => {
  const [date,setDate] = useState(''); const [reason,setReason] = useState(''); const [busy,setBusy] = useState(false);
  const [days,setDays] = useState<{blocked_date:string;reason:string}[]>([]);
  const [feedback,setFeedback] = useState('');
  const load = useCallback(async()=>{
    const {data,error} = await createClient().from('blocked_dates').select('blocked_date,reason').order('blocked_date');
    if(error) onError(error.message); else setDays(data || []);
  },[onError]);
  useEffect(()=>{
    void load(); const client=createClient();
    const channel=client.channel(`blocked-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'blocked_dates'},load).subscribe();
    window.addEventListener('inventory-changed',load);
    return()=>{void client.removeChannel(channel);window.removeEventListener('inventory-changed',load);};
  },[load]);
  const change = async(target:string,closed:boolean)=>{
    setBusy(true);onError('');setFeedback('');
    try {await blockDate(target,closed,reason);onDateChange(target);setReason('');setFeedback(`${dateLabel(target)} ${closed?'blocked':'reopened'}.`);await load();}
    catch(e){onError(e instanceof Error?e.message:'Unable to change blocked dates');}
    finally{setBusy(false);}
  };
  return <aside className="space-y-4 min-w-0">
    <h2 className="font-bold text-lg flex items-center gap-2"><CalendarX size={18}/>Blocked days</h2>
    <form data-testid="block-date-form" onSubmit={e=>{e.preventDefault();void change(date||selectedDate,true);}} onInvalid={()=>onError('Choose a valid date to block.')} className="space-y-3 border-b border-border pb-5">
      <label className="block text-xs font-medium">Date
        <input data-testid="block-date-input" disabled={!ready || busy} aria-label="Date to block" type="date" required value={date||selectedDate} onChange={e=>setDate(e.target.value)} className="w-full min-w-0 border border-border rounded-lg p-2 mt-1 text-sm"/>
      </label>
      <input data-testid="block-reason-input" aria-label="Closure reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (e.g. Holiday)" maxLength={200} className="w-full border border-border rounded-lg p-2 text-sm"/>
      <button type="submit" data-testid="block-date-submit" disabled={busy || !ready} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 text-sm transition-colors disabled:opacity-50">{busy?'Saving…':'Block date'}</button>
    </form>
    {feedback&&<p data-testid="block-date-feedback" role="status" className="text-sm text-green-700">{feedback}</p>}
    {days.length===0 && <p data-testid="blocked-days-empty" className="text-sm text-muted-foreground">No blocked days.</p>}
    {days.map(day=><div key={day.blocked_date} data-testid={`blocked-day-${day.blocked_date}`} className="flex items-center justify-between gap-2 border-b border-border pb-3">
      <div className="min-w-0"><p className="text-sm font-semibold">{dateLabel(day.blocked_date)}</p><p className="text-xs text-muted-foreground break-words">{day.reason}</p></div>
      <button data-testid={`unblock-date-${day.blocked_date}`} disabled={busy} onClick={()=>change(day.blocked_date,false)} title="Unblock date" aria-label={`Unblock ${day.blocked_date}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15}/></button>
    </div>)}
  </aside>;
};