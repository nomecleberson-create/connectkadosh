import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mpFetch, siteUrl } from '@/lib/mp';
import { getOrderByPublicId, setStatus } from '@/lib/orders';

export const dynamic = 'force-dynamic';

// Cartão via Checkout Pro: a preferência é criada no servidor com os valores do banco.
export async function POST(req) {
  try {
    const { publicId } = await req.json();
    const order = await getOrderByPublicId(publicId);
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (!['recebido', 'pagamento_pendente'].includes(order.status)) {
      return NextResponse.json({ error: 'Este pedido não aceita novo pagamento.' }, { status: 409 });
    }
    const d = db();
    const { count } = await d.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', order.id).eq('method', 'checkout_pro');
    const idempotencyKey = `pref-${order.id}-${count ?? 0}`;
    const back = `${siteUrl()}/pedido/${order.public_id}`;

    const items = order.order_items.map((i) => ({
      title: i.product_name, quantity: i.quantity, currency_id: 'BRL', unit_price: i.total_cents / i.quantity / 100,
    }));
    if (order.shipping_cents > 0) {
      items.push({ title: `Entrega: ${order.shipping_name}`, quantity: 1, currency_id: 'BRL', unit_price: order.shipping_cents / 100 });
    }
    const [first, ...rest] = order.customers.name.split(' ');
    const pref = await mpFetch('/checkout/preferences', {
      method: 'POST', idempotencyKey,
      body: {
        items,
        payer: { email: order.customers.email, name: first, surname: rest.join(' ') },
        external_reference: order.id,
        notification_url: `${siteUrl()}/api/webhooks/mercadopago`,
        back_urls: { success: back, pending: back, failure: back },
        auto_return: 'approved',
        statement_descriptor: 'CONNECTKADOSH',
      },
    });
    const { error } = await d.from('payments').insert({
      order_id: order.id, method: 'checkout_pro', status: 'pendente', amount_cents: order.total_cents,
      mp_preference_id: pref.id, idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    await setStatus(order, 'pagamento_pendente', 'Cliente enviado ao Checkout Pro.');
    return NextResponse.json({ url: pref.init_point });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível abrir o pagamento. Tente novamente.' }, { status: 502 });
  }
}
