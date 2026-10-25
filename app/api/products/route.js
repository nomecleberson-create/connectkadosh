import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db().from('products').select('id,slug,name,description,price_cents,image_url,stock').eq('active', true).order('created_at');
  if (error) return NextResponse.json({ error: 'Catálogo indisponível.' }, { status: 500 });
  return NextResponse.json({ products: data });
}
