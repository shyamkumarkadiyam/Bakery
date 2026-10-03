import { NextRequest } from 'next/server';
import { inventoryRpc,invalidRequest,validDate } from '@/lib/inventory-api';
export async function GET(request:NextRequest){
  const date=request.nextUrl.searchParams.get('date');
  if(date!==null&&!validDate(date))return invalidRequest();
  return inventoryRpc('menu_availability',{p_date:date});
}