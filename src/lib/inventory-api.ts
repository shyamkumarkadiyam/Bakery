import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inventoryErrorMessage } from './inventory-errors';

export async function inventoryRpc(name: string,args: Record<string,unknown>) {
  const client=await createClient();
  const {data,error}=await client.rpc(name,args);
  if(error) return NextResponse.json({error:inventoryErrorMessage(error)},{status:error.code==='42501'?403:error.code==='P0001'?409:400});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export const invalidRequest=()=>NextResponse.json({error:'Invalid request body or date.'},{status:400});
export const validDate=(date:unknown)=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date);