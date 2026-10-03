export function inventoryErrorMessage(error:{code?:string;message?:string}):string {
  if(error.code==='P0001')return error.message || 'Unable to complete this request.';
  if(error.code==='42501')return 'Administrator access is required. Please sign in with your admin account.';
  if(error.code==='23514'||error.code==='23502'||error.code?.startsWith('22'))return 'Check the date, time and quantities, then try again.';
  if(error.code==='23503')return 'An item in your cart is no longer available. Please review your cart.';
  return 'Unable to complete this request right now. Please retry. Your cart has been kept.';
}