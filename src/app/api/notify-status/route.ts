import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

type Builder = (name: string, trackingLink: string) => string;

const MESSAGES: Record<string, Builder> = {
  confirmed: (name, link) =>
    `Hi ${name}! 🎉 Your Lolita Bakery order is confirmed. Track it here: ${link}`,
  enroute: (name) =>
    `Hi ${name}! 🚗 Your Lolita Bakery order is on the way. See you soon!`,
  delivered: (name) =>
    `Hi ${name}! 💛 Your Lolita Bakery order has been delivered. Enjoy — thank you for ordering with us!`,
  cancelled: (name) =>
    `Hi ${name}, your Lolita Bakery order has been cancelled. If this is a mistake, please contact us.`,
};

function toE164(raw: string): string {
  const trimmed = (raw || '').trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  const { orderId, status } = await req.json().catch(() => ({}));
  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const build = MESSAGES[status as string];
  if (!build) return NextResponse.json({ skipped: 'no-template-for-status' });

  const { data: order } = await supabase
    .from('orders')
    .select('customer_name, customer_phone')
    .eq('id', orderId)
    .single();

  if (!order?.customer_phone) return NextResponse.json({ skipped: 'no-phone-on-order' });

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return NextResponse.json({ skipped: 'twilio-not-configured' });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const body = build(order.customer_name || 'there', `${site}/order-status/${orderId}`);

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({ to: toE164(order.customer_phone), from, body });
    return NextResponse.json({ ok: true, sid: msg.sid });
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    console.error('Twilio send failed:', detail);
    return NextResponse.json({ error: 'send-failed', detail }, { status: 502 });
  }
}
