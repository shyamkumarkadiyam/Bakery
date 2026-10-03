'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { createClient } from '@/lib/supabase/client';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { notifyInventoryChange } from '@/lib/inventory';
import { inventoryErrorMessage } from '@/lib/inventory-errors';
import { SchedulePicker } from '@/components/SchedulePicker';
import CartStep from './CartStep';
import AddressStep from './AddressStep';
import PaymentStep from './PaymentStep';
import OrderSuccessStep from './OrderSuccessStep';

export type CheckoutData = {
  deliveryType:'delivery'|'pickup';
  address:{name:string;phone:string;street:string;apt:string;city:string;zip:string;instructions:string};
  paymentMethod:'cash'|'zelle';
};
const defaultData:CheckoutData={deliveryType:'delivery',address:{name:'',phone:'',street:'',apt:'',city:'',zip:'',instructions:''},paymentMethod:'zelle'};
type Receipt={id:string;total:number;scheduled_for:string|null;timezone:string};

export default function CartCheckoutClient(){
  const [step,setStep]=useState(0); const [checkoutData,setCheckoutData]=useState(defaultData);
  const [orderError,setOrderError]=useState(''); const [placing,setPlacing]=useState(false);
  const [receipt,setReceipt]=useState<Receipt|null>(null); const inFlight=useRef(false);
  const {items:cartItems,mode,date,time}=useCartStore();
  const setSchedule=useCartStore(s=>s.setSchedule); const hydrated=useCartStore(s=>s.hydrated);
  useEffect(()=>{ if(hydrated) setSchedule({mode:'now'}); },[hydrated,setSchedule]);
  const availability=useAvailability(mode==='later'?date:undefined);
  const stock=availability.data?.items;
  // Show authoritative menu prices/names for regular items; box lines pass through.
  const items=useMemo(()=>cartItems.map(item=>{
    if(item.isBox) return item;
    const current=stock?.find(i=>i.id===item.id);
    return current?{...item,name:current.name,price:current.price}:item;
  }),[cartItems,stock]);
  // Aggregate demand per menu item across regular lines and box components.
  const demand=useMemo(()=>{
    const d:Record<string,number>={};
    items.forEach(it=>{
      if(it.isBox) it.components?.forEach(c=>{d[c.id]=(d[c.id]||0)+c.qty*it.qty;});
      else d[it.id]=(d[it.id]||0)+it.qty;
    });
    return d;
  },[items]);
  const issues=!stock?[]:Object.entries(demand).flatMap(([id,qty])=>{
    const current=stock.find(i=>i.id===id);
    const label=current?.name||id;
    if(!current) return [`${label} is no longer on the menu. Remove it to continue.`];
    if(!current.available) return [`${label} is Out of Stock for this date.`];
    const limit=Math.min(current.remaining,current.max_qty_per_order);
    return qty>limit?[`${label}: maximum ${limit} available for this order.`]:[];
  });
  const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:availability.data?.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  const invalidSchedule=mode==='later'&&(!date||!time||date<availability.today||(date===availability.today&&time<=localTime));
  const cannotOrder=availability.loading||!!availability.error||!!availability.data?.blocked||issues.length>0||!items.length||invalidSchedule;
  const handlePlaceOrder=async()=>{
    if(inFlight.current||cannotOrder)return;
    inFlight.current=true;setPlacing(true);setOrderError('');
    const address=checkoutData.address;
    const regular=items.filter(i=>!i.isBox);
    const boxLines=items.filter(i=>i.isBox);
    const boxes=boxLines.flatMap(b=>Array.from({length:b.qty},()=>({label:b.boxLabel||b.name,items:(b.components||[]).map(c=>({id:c.id,qty:c.qty}))})));
    const boxNoteStr=boxLines.map(b=>`${b.boxLabel||b.name} [${(b.components||[]).map(c=>`${c.qty}× ${c.name}`).join(', ')}]`).join(' | ');
    const payload={mode,date:mode==='later'?date:null,time:mode==='later'?time:null,
      customer_name:address.name,customer_phone:address.phone,
      customer_address:checkoutData.deliveryType==='pickup'?'Pickup':[address.street,address.apt,address.city,address.zip].filter(Boolean).join(', '),
      delivery_type:checkoutData.deliveryType,payment_method:checkoutData.paymentMethod,notes:[boxNoteStr,address.instructions].filter(Boolean).join(' | '),
      items:regular.map(i=>({id:i.id,qty:i.qty})),boxes};
    try{
      const fingerprint=JSON.stringify(payload);
      const saved=sessionStorage.getItem('lolita-checkout-request');
      const pending=saved?JSON.parse(saved):null;
      const id=pending?.fingerprint===fingerprint?pending.id:crypto.randomUUID();
      sessionStorage.setItem('lolita-checkout-request',JSON.stringify({id,fingerprint}));
      const {data,error}=await createClient().rpc('place_inventory_order',{p_request_id:id,p_payload:payload});
      if(error)throw new Error(inventoryErrorMessage(error));
      if(!data?.id)throw new Error('Order confirmation was not received. Please retry.');
      setReceipt(data as Receipt);sessionStorage.removeItem('lolita-checkout-request');notifyInventoryChange();
    }catch(e){setOrderError(e instanceof Error?e.message:'Could not place your order. Please retry.');await availability.refresh();}
    finally{inFlight.current=false;setPlacing(false);}
  };
  if(receipt)return <div data-testid="checkout-state" data-state="success"><OrderSuccessStep orderId={receipt.id} deliveryType={checkoutData.deliveryType} scheduledFor={receipt.scheduled_for} timezone={receipt.timezone} total={receipt.total}/></div>;
  const subtotal=items.reduce((sum,i)=>sum+i.price*i.qty,0);const delivery=checkoutData.deliveryType==='delivery'?3.5:0;
  return <div data-testid="checkout-state" data-state={placing?'submitting':'editing'} aria-busy={placing} className="pt-20 pb-24 min-h-screen"><div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6 space-y-6">
    <div data-testid="checkout-progress" className="flex gap-4 text-sm font-semibold">{['Cart','Delivery','Payment'].map((label,i)=><span key={label} className={i===step?'text-primary':'text-muted-foreground'}>{i+1}. {label}</span>)}</div>
    <SchedulePicker prefix="checkout-schedule" disabled={placing}/>
    {(availability.error||orderError) && <div data-testid="checkout-error" role="alert" className="text-red-700 bg-red-50 p-4 rounded-lg">{orderError||availability.error}<button data-testid="checkout-retry-stock" onClick={availability.refresh} className="block underline mt-2 text-sm">Refresh availability</button></div>}
    {availability.data?.blocked&&<p data-testid="checkout-closed" role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">The bakery is closed on this date. Please choose another date.</p>}
    {invalidSchedule&&<p data-testid="checkout-invalid-schedule" role="alert" className="text-amber-800 bg-amber-50 p-3 rounded-lg text-sm">Choose a future date and time to continue.</p>}
    {!!issues.length&&<ul data-testid="checkout-stock-issues" role="alert" className="text-red-700 bg-red-50 p-4 rounded-lg text-sm space-y-1">{issues.map(issue=><li key={issue}>{issue}</li>)}{step>0&&<li><button data-testid="checkout-edit-cart" onClick={()=>setStep(0)} className="underline font-semibold">Edit cart</button></li>}</ul>}
    <div className="grid lg:grid-cols-3 gap-8"><section className="lg:col-span-2 min-w-0">
      {step===0&&<CartStep items={items} onNext={()=>setStep(1)} data={checkoutData} setData={setCheckoutData} stock={stock} disabled={cannotOrder}/>}
      {step===1&&<AddressStep data={checkoutData} setData={setCheckoutData} onNext={()=>setStep(2)} onBack={()=>setStep(0)}/>}
      {step===2&&<PaymentStep data={checkoutData} setData={setCheckoutData} items={items} onPlace={handlePlaceOrder} onBack={()=>setStep(1)} placing={placing} disabled={cannotOrder}/>}
    </section><aside className="border-t lg:border-t-0 lg:border-l border-border pt-5 lg:pt-0 lg:pl-6 space-y-3 min-w-0">
      <h2 className="font-bold text-lg">Order summary</h2>
      {items.map(item=><div data-testid={`checkout-summary-${item.id}`} key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.name} ×{item.qty}</span><span className="font-semibold">${(item.price*item.qty).toFixed(2)}</span></div>)}
      <div data-testid="checkout-subtotal" className="flex justify-between text-sm pt-3 border-t border-border"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      <div data-testid="checkout-delivery-fee" className="flex justify-between text-sm"><span>Delivery</span><span>${delivery.toFixed(2)}</span></div>
      <div data-testid="checkout-tax" className="flex justify-between text-sm"><span>Tax (8%)</span><span>${(subtotal*.08).toFixed(2)}</span></div>
      <div data-testid="checkout-total" className="flex justify-between font-bold border-t border-border pt-3"><span>Total</span><span>${(subtotal+delivery+Math.round(subtotal*8)/100).toFixed(2)}</span></div>
    </aside></div>
  </div></div>;
}