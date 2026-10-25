import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mpFetch, siteUrl } from '@/lib/mp';
import { getOrderByPublicId, setStatus } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { publicId } = await req.json();
    const order = await getOrderByPublicId(publicId);
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (!['recebido', 'pagamento_pendente'].includes(order.status)) {
      return NextResponse.json({ error: 'Este pedido não aceita novo pagamento.' }, { status: 409 });
    }
    const d = db();
    // Idempotência: reaproveita um Pix pendente que ainda não expirou.
    const { data: existing } = await d.from('payments').select('id,pix_expires_at').eq('order_id', order.id).eq('method', 'pix').eq('status', 'pendente')
      .gt('pix_expires_at', new Date().toISOString()).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ reused: true });

    const { count } = await d.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', order.id).eq('method', 'pix');
    const idempotencyKey = `pix-${order.id}-${count ?? 0}`;
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    const [first, ...rest] = order.customers.name.split(' ');

    const mp = await mpFetch('/v1/payments', {
      method: 'POST', idempotencyKey,
      body: {
        transaction_amount: order.total_cents / 100,
        description: process.env.PAYMENT_DESCRIPTION || 'Connect Kadosh',
        payment_method_id: 'pix',
        external_reference: order.id,
        notification_url: `${siteUrl()}/api/webhooks/mercadopago`,
        date_of_expiration: expires.toISOString().replace('Z', '+00:00'),
        payer: { email: order.customers.email, first_name: first, last_name: rest.join(' ') || first },
      },
    });
    const tx = mp.point_of_interaction?.transaction_data || {};
    const { error } = await d.from('payments').insert({
      order_id: order.id, method: 'pix', status: 'pendente', amount_cents: order.total_cents,
      mp_payment_id: String(mp.id), mp_status: mp.status, idempotency_key: idempotencyKey,
      pix_qr_code: tx.qr_code, pix_qr_base64: tx.qr_code_base64, pix_expires_at: expires.toISOString(),
    });
    if (error) throw error;
    await setStatus(order, 'pagamento_pendente', 'Pix gerado. Aguardando pagamento.');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível gerar o Pix. Tente novamente.' }, { status: 502 });
  }
}
