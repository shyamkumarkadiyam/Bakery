import { inventoryRpc,invalidRequest,validDate } from '@/lib/inventory-api';
export async function PATCH(request:Request){
  try{
    const {itemId,date,changes}=await request.json();
    if(typeof itemId!=='string'||!validDate(date)||!changes||typeof changes!=='object'||Array.isArray(changes))return invalidRequest();
    return inventoryRpc('set_item_inventory',{p_item_id:itemId,p_date:date,p_changes:changes});
  }catch{return invalidRequest();}
}