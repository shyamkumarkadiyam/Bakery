import { inventoryRpc,invalidRequest,validDate } from '@/lib/inventory-api';
export async function POST(request:Request){
  try{
    const {date,blocked,reason}=await request.json();
    if(!validDate(date)||typeof blocked!=='boolean'||(reason!==undefined&&typeof reason!=='string'))return invalidRequest();
    return inventoryRpc('set_blocked_date',{p_date:date,p_blocked:blocked,p_reason:reason||'Closed'});
  }catch{return invalidRequest();}
}