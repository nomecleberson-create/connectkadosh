import { NextResponse } from 'next/server';
import { createOrder, OrderError } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { publicId, orderNumber } = await createOrder(body);
    return NextResponse.json({ publicId, orderNumber });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível criar o pedido. Tente novamente.' }, { status: 500 });
  }
}
