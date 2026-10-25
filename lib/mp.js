const BASE = 'https://api.mercadopago.com';

export async function mpFetch(path, { method = 'GET', body, idempotencyKey } = {}) {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado.');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Mercado Pago erro', res.status, JSON.stringify(data));
    const err = new Error('Falha ao comunicar com o Mercado Pago.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
