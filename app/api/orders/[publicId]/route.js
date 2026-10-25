import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mpFetch } from '@/lib/mp';
import { getOrderByPublicId, syncPaymentFromMp } from '@/lib/orders';
import { formatOrderNumber } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  let order = await getOrderByPublicId(params.publicId);
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  // Retorno do Checkout Pro: o payment_id da URL só indica QUAL pagamento consultar;
  // o resultado vem da API do Mercado Pago e só vale se pertencer a este pedido.
  const paymentId = new URL(req.url).searchParams.get('payment_id');
  if (paymentId && /^\d+$/.test(paymentId)) {
    try {
      const mp = await mpFetch(`/v1/payments/${paymentId}`);
      if (mp.external_reference === order.id) {
        await syncPaymentFromMp(paymentId);
        order = await getOrderByPublicId(params.publicId);
      }
    } catch (e) { console.error(e); }
  }

  const d = db();
  const [{ data: history }, { data: pays }] = await Promise.all([
    d.from('order_status_history').select('status,created_at').eq('order_id', order.id).order('created_at'),
    d.from('payments').select('method,status,pix_qr_code,pix_qr_base64,pix_expires_at').eq('order_id', order.id).order('created_at', { ascending: false }).limit(1),
  ]);
  const pay = pays?.[0] || null;
  const pending = pay && pay.status === 'pendente';
  return NextResponse.json({
    orderNumber: formatOrderNumber(order.order_number),
    status: order.status,
    firstName: order.customers.name.split(' ')[0],
    total_cents: order.total_cents,
    items: order.order_items.map((i) => ({ name: i.product_name, quantity: i.quantity })),
    estimatedDelivery: order.estimated_delivery,
    deliveryMessage: order.delivery_message,
    history: history || [],
    payment: pay && {
      method: pay.method, status: pay.status,
      pix: pending && pay.method === 'pix' ? { code: pay.pix_qr_code, qr: pay.pix_qr_base64, expires: pay.pix_expires_at } : null,
    },
  });
}
