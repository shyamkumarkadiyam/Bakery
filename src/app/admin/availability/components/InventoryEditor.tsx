'use client';
import { useState } from 'react';
import { Pencil, RotateCcw, Save, X } from 'lucide-react';
import { InventoryItem, updateInventory } from '@/lib/inventory';
import { StockToggle } from '@/components/StockToggle';

export const InventoryEditor = ({ item,date,closed,onError }: {
  item: InventoryItem; date: string; closed: boolean; onError: (error:string)=>void;
}) => {
  const [editing,setEditing] = useState(false);
  const [busy,setBusy] = useState(false);
  const [draft,setDraft] = useState({ defaultQty:'',quota:'',maxQty:'',threshold:'' });
  const start = () => {
    setDraft({defaultQty:String(item.default_daily_quantity),quota:item.has_override?String(item.daily_limit):'',maxQty:String(item.max_qty_per_order),threshold:String(item.low_stock_threshold)});
    setEditing(true); onError('');
  };
  const save = async (reset=false) => {
    setBusy(true); onError('');
    try {
      await updateInventory(item.id,date,reset ? {reset:true} : {
        default_daily_quantity:Number(draft.defaultQty),daily_limit:draft.quota===''?null:Number(draft.quota),
        max_qty_per_order:Number(draft.maxQty),low_stock_threshold:Number(draft.threshold),
      });
      setEditing(false);
    } catch(e) { onError(e instanceof Error?e.message:'Unable to save quantities'); }
    finally { setBusy(false); }
  };
  return <article data-testid={`stock-item-${item.id}`} className="bg-white rounded-lg border border-border p-4 min-w-0">
    <div className="flex justify-between items-start gap-3">
      <div className="min-w-0"><h3 data-testid={`stock-name-${item.id}`} className="font-bold text-sm break-words">{item.name}</h3><p className="text-xs capitalize text-muted-foreground mt-1">{item.category}</p></div>
      <span data-testid={`stock-remaining-${item.id}`} className={`text-2xl font-bold flex-shrink-0 ${item.remaining===0?'text-red-600':'text-green-700'}`}>{item.remaining}<span className="text-xs font-normal ml-1">left</span></span>
    </div>
    <dl className="grid grid-cols-3 gap-2 my-4 text-xs">
      <div><dt className="text-muted-foreground">Daily default</dt><dd data-testid={`stock-default-${item.id}`} className="font-semibold mt-1">{item.default_daily_quantity}</dd></div>
      <div><dt className="text-muted-foreground">Date quota</dt><dd data-testid={`stock-quota-${item.id}`} className="font-semibold mt-1">{item.daily_limit}{!item.has_override && ' (default)'}</dd></div>
      <div><dt className="text-muted-foreground">Reserved</dt><dd data-testid={`stock-reserved-${item.id}`} className="font-semibold mt-1">{item.orders_taken}</dd></div>
    </dl>
    {editing ? <form data-testid={`stock-edit-form-${item.id}`} onSubmit={e=>{e.preventDefault();void save();}} className="border-t border-border pt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {([{key:'defaultQty',label:'Default daily quantity',min:0,required:true},{key:'quota',label:'Date quota (total)',min:0,required:false},
          {key:'maxQty',label:'Maximum per order',min:1,required:true},{key:'threshold',label:'Low stock alert at',min:0,required:true}] as const).map(field=>
          <label key={field.key} className="text-xs font-medium min-w-0">{field.label}
            <input data-testid={`stock-${field.key}-${item.id}`} aria-label={`${item.name} ${field.label}`} type="number" min={field.min} max={100000} step={1} required={field.required}
              value={draft[field.key]} placeholder={field.key==='quota'?'Use default':undefined} onChange={e=>setDraft({...draft,[field.key]:e.target.value})}
              className="block w-full min-w-0 border border-border rounded-lg p-2 mt-1 text-sm"/>
          </label>)}
      </div>
      <div className="flex gap-2">
        <button data-testid={`stock-save-${item.id}`} disabled={busy} type="submit" className="bg-primary text-white px-3 py-2 rounded-lg text-xs flex gap-1 items-center disabled:opacity-50"><Save size={13}/>{busy?'Saving…':'Save'}</button>
        <button data-testid={`stock-cancel-${item.id}`} disabled={busy} type="button" onClick={()=>setEditing(false)} className="px-3 py-2 rounded-lg text-xs flex gap-1 items-center hover:bg-muted"><X size={13}/>Cancel</button>
      </div>
    </form> : <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <StockToggle item={item} date={date} closed={closed} onError={onError} prefix="availability"/>
      <button data-testid={`stock-edit-${item.id}`} onClick={start} title="Edit quantities" aria-label={`Edit ${item.name} quantities`} className="p-2 rounded-lg hover:bg-muted"><Pencil size={15}/></button>
      {(item.has_override || item.is_blocked) && <button data-testid={`stock-reset-${item.id}`} disabled={busy} onClick={()=>save(true)} title="Restore daily default; keep reservations" aria-label={`Reset ${item.name} to default`} className="p-2 rounded-lg hover:bg-muted"><RotateCcw size={15}/></button>}
    </div>}
  </article>;
};