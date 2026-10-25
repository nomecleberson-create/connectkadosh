import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildOrderLines, calcTotals, sanitizeCustomization, OrderError } from '../lib/pricing.js';
import { verifyWebhookSignature } from '../lib/signature.js';

const tag = { id: 'p1', name: 'Tag NFC + QR Code', price_cents: 1500, active: true, stock: null };
const catalog = new Map([['p1', tag], ['p2', { id: 'p2', name: 'Inativo', price_cents: 100, active: false, stock: null }]]);

test('o preço vem do cadastro, ignorando valores enviados pelo navegador', () => {
  const lines = buildOrderLines([{ productId: 'p1', quantity: 3, price_cents: 1, unit_cents: 1 }], catalog);
  assert.equal(lines[0].unit_cents, 1500);
  assert.equal(calcTotals(lines, { price_cents: 1000 }).total_cents, 5500);
});

test('rejeita carrinho vazio, produto inativo ou inexistente e quantidade inválida', () => {
  assert.throws(() => buildOrderLines([], catalog), OrderError);
  assert.throws(() => buildOrderLines([{ productId: 'p2', quantity: 1 }], catalog), OrderError);
  assert.throws(() => buildOrderLines([{ productId: 'x', quantity: 1 }], catalog), OrderError);
  for (const q of [0, -1, 1.5, 'abc', 501]) assert.throws(() => buildOrderLines([{ productId: 'p1', quantity: q }], catalog), OrderError);
});

test('respeita o estoque quando ele é controlado', () => {
  const c = new Map([['p1', { ...tag, stock: 2 }]]);
  assert.throws(() => buildOrderLines([{ productId: 'p1', quantity: 3 }], c), OrderError);
  assert.equal(buildOrderLines([{ productId: 'p1', quantity: 2 }], c)[0].total_cents, 3000);
});

test('personalização aceita só campos conhecidos e limita o tamanho', () => {
  const out = sanitizeCustomization({ instagram: ' @connect_kadosh ', hack: 'x', notes: 'a'.repeat(999) });
  assert.deepEqual(Object.keys(out).sort(), ['instagram', 'notes']);
  assert.equal(out.instagram, '@connect_kadosh');
  assert.equal(out.notes.length, 300);
});

test('assinatura do webhook: válida passa, adulterada falha', () => {
  const secret = 's3gredo', ts = '1700000000', reqId = 'req-1', id = '12345';
  const v1 = crypto.createHmac('sha256', secret).update(`id:${id};request-id:${reqId};ts:${ts};`).digest('hex');
  const base = { xSignature: `ts=${ts},v1=${v1}`, xRequestId: reqId, dataId: id, secret };
  assert.equal(verifyWebhookSignature(base), true);
  assert.equal(verifyWebhookSignature({ ...base, dataId: '99999' }), false);
  assert.equal(verifyWebhookSignature({ ...base, secret: 'outro' }), false);
  assert.equal(verifyWebhookSignature({ ...base, secret: undefined }), false);
});
