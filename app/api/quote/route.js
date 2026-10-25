import { NextResponse } from 'next/server';
import { quote, OrderError } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { items, shippingOptionId } = await req.json();
    const { lines, totals } = await quote(items, shippingOptionId);
    return NextResponse.json({
      lines: lines.map((l) => ({ productId: l.product.id, name: l.product.name, quantity: l.quantity, unit_cents: l.unit_cents, total_cents: l.total_cents })),
      totals,
    });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível calcular o pedido.' }, { status: 500 });
  }
}
