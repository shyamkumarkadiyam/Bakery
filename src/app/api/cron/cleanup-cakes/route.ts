import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.rpc('cleanup_cake_quotes');
    if (error) throw error;
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    console.error('cleanup-cakes failed:', detail);
    return NextResponse.json({ error: 'cleanup-failed', detail }, { status: 500 });
  }
}
