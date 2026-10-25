// Regras de preço e validação de pedido. Funções puras: o preço vem SEMPRE do cadastro (banco), nunca do navegador.

export class OrderError extends Error {}

const FIELDS = ['instagram', 'whatsapp', 'wifi_name', 'wifi_password', 'google_review', 'pix', 'site', 'notes'];

export function sanitizeCustomization(c) {
  const out = {};
  if (!c || typeof c !== 'object') return out;
  for (const key of FIELDS) {
    const v = c[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, 300);
  }
  return out;
}

export function buildOrderLines(requested, productsById) {
  if (!Array.isArray(requested) || requested.length === 0) throw new OrderError('O carrinho está vazio.');
  if (requested.length > 30) throw new OrderError('Itens demais no carrinho.');
  const lines = [];
  for (const r of requested) {
    const p = productsById.get(r?.productId);
    if (!p || !p.active) throw new OrderError('Um dos produtos não está mais disponível.');
    const quantity = Number(r.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new OrderError('Quantidade inválida.');
    if (p.stock !== null && p.stock !== undefined && quantity > p.stock) {
      throw new OrderError(`Estoque insuficiente para ${p.name}.`);
    }
    lines.push({
      product: p,
      quantity,
      unit_cents: p.price_cents,
      total_cents: p.price_cents * quantity,
      customization: sanitizeCustomization(r.customization),
    });
  }
  return lines;
}

export function calcTotals(lines, shipping) {
  const subtotal_cents = lines.reduce((s, l) => s + l.total_cents, 0);
  const shipping_cents = shipping ? shipping.price_cents : 0;
  return { subtotal_cents, shipping_cents, total_cents: subtotal_cents + shipping_cents };
}
