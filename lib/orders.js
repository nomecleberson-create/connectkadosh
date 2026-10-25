import crypto from 'node:crypto';
import { db } from './db.js';
import { mpFetch } from './mp.js';
import { buildOrderLines, calcTotals, OrderError } from './pricing.js';

export { OrderError };

export const newPublicId = () => crypto.randomBytes(16).toString('base64url');

async function loadCatalog(ids) {
  const { data, error } = await db().from('products').select('*').in('id', ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p]));
}

async function loadShipping(id) {
  if (!id) throw new OrderError('Escolha uma opção de entrega.');
  const { data } = await db().from('shipping_options').select('*').eq('id', id).eq('active', true).maybeSingle();
  if (!data) throw new OrderError('Opção de entrega indisponível.');
  return data;
}

// Orçamento calculado no servidor, com preços oficiais do banco.
export async function quote(items, shippingOptionId) {
  const ids = [...new Set((items || []).map((i) => i?.productId).filter(Boolean))];
  const catalog = await loadCatalog(ids);
  const lines = buildOrderLines(items, catalog);
  const shipping = shippingOptionId ? await loadShipping(shippingOptionId) : null;
  return { lines, shipping, totals: calcTotals(lines, shipping) };
}

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validateCustomer(c, a) {
  const customer = { name: clean(c?.name, 120), email: clean(c?.email, 160).toLowerCase(), phone: clean(c?.phone, 30) };
  const address = {
    zip: clean(a?.zip, 12), street: clean(a?.street), number: clean(a?.number, 20), complement: clean(a?.complement),
    district: clean(a?.district), city: clean(a?.city), state: clean(a?.state, 2).toUpperCase(),
  };
  if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email) || customer.phone.replace(/\D/g, '').length < 10) {
    throw new OrderError('Confira nome, e-mail e WhatsApp.');
  }
  return { customer, address };
}

export async function createOrder({ items, customer: c, address: a, shippingOptionId, notes }) {
  const { customer, address } = validateCustomer(c, a);
  const { lines, shipping, totals } = await quote(items, shippingOptionId);
  const needsAddress = shipping.price_cents > 0;
  if (needsAddress && (!address.zip || !address.street || !address.number || !address.district || !address.city || address.state.length !== 2)) {
    throw new OrderError('Preencha o endereço completo para entrega.');
  }
  const d = db();
  const { data: cust, error: e1 } = await d.from('customers').insert(customer).select().single();
  if (e1) throw e1;
  let addressId = null;
  if (needsAddress) {
    const { data: addr, error: e2 } = await d.from('addresses').insert({ ...address, customer_id: cust.id }).select().single();
    if (e2) throw e2;
    addressId = addr.id;
  }
  const publicId = newPublicId();
  const { data: order, error: e3 } = await d.from('orders').insert({
    public_id: publicId, customer_id: cust.id, address_id: addressId, shipping_option_id: shipping.id,
    shipping_name: shipping.name, status: 'recebido', notes: clean(notes, 500) || null, ...totals,
  }).select().single();
  if (e3) throw e3;

  for (const l of lines) {
    const { data: item, error: e4 } = await d.from('order_items').insert({
      order_id: order.id, product_id: l.product.id, product_name: l.product.name,
      unit_cents: l.unit_cents, quantity: l.quantity, total_cents: l.total_cents,
    }).select().single();
    if (e4) throw e4;
    const { error: e5 } = await d.from('customizations').insert({ order_item_id: item.id, data: l.customization });
    if (e5) throw e5;
  }
  await addHistory(order.id, 'recebido', 'Pedido criado pelo cliente.', 'cliente');
  return { publicId, orderNumber: order.order_number };
}

export async function addHistory(orderId, status, note, actor = 'sistema') {
  await db().from('order_status_history').insert({ order_id: orderId, status, note, actor });
}

export async function setStatus(order, status, note, actor = 'sistema') {
  if (order.status === status) return;
  const { error } = await db().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order.id);
  if (error) throw error;
  await addHistory(order.id, status, note, actor);
}

export async function getOrderByPublicId(publicId) {
  if (typeof publicId !== 'string' || publicId.length < 16 || publicId.length > 64) return null;
  const { data } = await db().from('orders')
    .select('*, customers(name,email,phone), order_items(product_name,quantity,total_cents)')
    .eq('public_id', publicId).maybeSingle();
  return data;
}

function mapMpStatus(p) {
  switch (p.status) {
    case 'approved': return 'aprovado';
    case 'authorized': case 'pending': case 'in_process': case 'in_mediation': return 'pendente';
    case 'rejected': return 'recusado';
    case 'refunded': case 'charged_back': return 'reembolsado';
    case 'cancelled': return p.status_detail === 'expired' ? 'expirado' : 'cancelado';
    default: return 'pendente';
  }
}

// Fonte da verdade: sempre o pagamento consultado na API do Mercado Pago (nunca o que veio do navegador).
export async function syncPaymentFromMp(mpPaymentId) {
  const mp = await mpFetch(`/v1/payments/${encodeURIComponent(mpPaymentId)}`);
  const orderId = mp.external_reference;
  if (!orderId) return { ignored: 'sem external_reference' };
  const d = db();
  const { data: order } = await d.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return { ignored: 'pedido não encontrado' };

  const status = mapMpStatus(mp);
  const method = mp.payment_method_id === 'pix' ? 'pix' : 'checkout_pro';
  const amount = Math.round(Number(mp.transaction_amount) * 100);
  const fields = {
    status, mp_status: mp.status, mp_status_detail: mp.status_detail, mp_payment_id: String(mp.id),
    updated_at: new Date().toISOString(),
  };

  let { data: pay } = await d.from('payments').select('*').eq('mp_payment_id', String(mp.id)).maybeSingle();
  if (!pay) {
    const { data: open } = await d.from('payments').select('*').eq('order_id', order.id).eq('method', method)
      .is('mp_payment_id', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
    pay = open;
  }
  if (pay) await d.from('payments').update(fields).eq('id', pay.id);
  else await d.from('payments').insert({ ...fields, order_id: order.id, method, amount_cents: amount });

  if (status === 'aprovado') {
    if (amount !== order.total_cents || mp.currency_id !== 'BRL') {
      await addHistory(order.id, order.status, `ALERTA: valor pago (${amount}) diferente do pedido (${order.total_cents}).`, 'sistema');
      return { alert: 'valor divergente' };
    }
    if (['recebido', 'pagamento_pendente'].includes(order.status)) {
      await setStatus(order, 'pagamento_aprovado', 'Pagamento confirmado pelo Mercado Pago.');
    }
  } else if (status === 'pendente' && order.status === 'recebido') {
    await setStatus(order, 'pagamento_pendente', 'Aguardando pagamento.');
  }
  return { status };
}
