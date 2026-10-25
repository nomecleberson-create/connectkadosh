import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db().from('shipping_options').select('id,name,description,price_cents').eq('active', true).order('sort');
  if (error) return NextResponse.json({ error: 'Fretes indisponíveis.' }, { status: 500 });
  return NextResponse.json({ options: data });
}
