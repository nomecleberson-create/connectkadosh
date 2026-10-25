'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ORDER_STEPS, OUT_FOR_DELIVERY_MESSAGE, stepIndex, formatBRL } from '@/lib/status';
import { whatsappLink } from '@/lib/whatsapp';

const PAY_LABEL = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado', cancelado: 'Cancelado', expirado: 'Expirado', reembolsado: 'Reembolsado' };
const fmt = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Tracker({ publicId }) {
  const qs = useSearchParams();
  const paymentId = qs.get('payment_id');
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const url = `/api/orders/${encodeURIComponent(publicId)}` + (paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : '');
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 404) { setError('Pedido não encontrado. Confira o código.'); return; }
    if (res.ok) setO(await res.json());
  }, [publicId, paymentId]);

  // Atualização automática a cada 6 s (e ao voltar para a aba).
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    const vis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  async function pay(kind) {
    setBusy(kind); setError('');
    const res = await fetch(`/api/pay/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Erro no pagamento.'); setBusy(''); return; }
    if (d.url) { window.location.href = d.url; return; }
    await load(); setBusy('');
  }

  if (error && !o) return <p className="err">{error}</p>;
  if (!o) return <p>Carregando pedido…</p>;

  const cancelled = o.status === 'cancelado';
  const idx = stepIndex(o.status);
  const needsPayment = ['recebido', 'pagamento_pendente'].includes(o.status);
  const pix = o.payment?.pix;
  const histAt = (key) => o.history.filter((h) => h.status === key).at(-1)?.created_at;

  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Pedido {o.orderNumber}</h1>
      <p className="muted">Olá, {o.firstName}. Guarde esta página: o endereço dela é o seu acesso seguro ao pedido.</p>

      {o.status === 'saiu_entrega' && <div className="notice" role="status">{OUT_FOR_DELIVERY_MESSAGE}</div>}
      {o.estimatedDelivery && !cancelled && o.status !== 'entregue' && <p>Previsão de entrega: <strong>{new Date(o.estimatedDelivery + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></p>}
      {o.deliveryMessage && <p>{o.deliveryMessage}</p>}
      {error && <p className="err" role="alert">{error}</p>}

      {needsPayment && (
        <div className="panel" style={{ margin: '20px 0' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Pagamento — {formatBRL(o.total_cents)}</h2>
          {pix ? (
            <div className="pix">
              <img src={`data:image/png;base64,${pix.qr}`} alt="QR Code Pix" />
              <p>Abra o app do seu banco, escolha Pix e leia o QR Code ou use o código abaixo.</p>
              <code>{pix.code}</code>
              <button className="btn" onClick={async () => { await navigator.clipboard.writeText(pix.code); setCopied(true); setTimeout(() => setCopied(false), 2500); }}>{copied ? 'Código copiado' : 'Copiar código Pix'}</button>
              <p className="muted" style={{ fontSize: '.9rem' }}>Válido até {fmt(pix.expires)}. Esta página atualiza sozinha quando o pagamento for confirmado.</p>
            </div>
          ) : (
            <>
              {o.payment && ['recusado', 'cancelado', 'expirado'].includes(o.payment.status) && <p className="err">Último pagamento: {PAY_LABEL[o.payment.status]}. Escolha uma forma para tentar de novo.</p>}
              <div className="f">
                <button className="btn" disabled={!!busy} onClick={() => pay('pix')}>{busy === 'pix' ? 'Gerando Pix…' : 'Pagar com Pix'}</button>
                <button className="btn ghost" disabled={!!busy} onClick={() => pay('card')}>{busy === 'card' ? 'Abrindo…' : 'Cartão (página segura do Mercado Pago)'}</button>
              </div>
            </>
          )}
          {pix && <p><button className="linkbtn" onClick={() => pay('card')}>Prefiro pagar com cartão</button></p>}
        </div>
      )}

      {cancelled ? <p className="err">Este pedido foi cancelado.</p> : (
        <ol className="timeline" aria-label="Andamento do pedido">
          {ORDER_STEPS.map((s, i) => {
            // "Pagamento pendente" fica concluído assim que o pagamento é aprovado.
            const done = i < idx || (i === idx && o.status === 'entregue');
            const now = i === idx;
            const when = histAt(s.key);
            return (
              <li key={s.key} className={(done || now ? 'done ' : '') + (now ? 'now' : '')} aria-current={now ? 'step' : undefined}>
                {s.label}{when && <small>{fmt(when)}</small>}
              </li>
            );
          })}
        </ol>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <strong>Itens</strong>
        {o.items.map((it, i) => <div className="line" key={i}><span>{it.quantity}× {it.name}</span></div>)}
        <div className="line total"><span>Total</span><span>{formatBRL(o.total_cents)}</span></div>
      </div>
      <p style={{ marginTop: 20 }}><a className="btn ghost" href={whatsappLink(`Olá! Quero falar sobre o pedido ${o.orderNumber}.`)} target="_blank" rel="noopener noreferrer">Falar sobre este pedido no WhatsApp</a></p>
    </>
  );
}
