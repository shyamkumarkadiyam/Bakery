import { inventoryRpc,invalidRequest } from '@/lib/inventory-api';
export async function POST(request:Request){
  try{
    const {requestId,order}=await request.json();
    if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)||!order||typeof order!=='object')return invalidRequest();
    return inventoryRpc('place_inventory_order',{p_request_id:requestId,p_payload:order});
  }catch{return invalidRequest();}
}