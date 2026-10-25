'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/status';

const empty = { name: '', email: '', phone: '', zip: '', street: '', number: '', complement: '', district: '', city: '', state: '' };

export default function Checkout() {
  const { items, ready, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [options, setOptions] = useState([]);
  const [shippingId, setShippingId] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const payload = items.map((i) => ({ productId: i.productId, quantity: i.quantity, customization: i.customization }));
  const shipping = options.find((o) => o.id === shippingId);
  const needsAddress = shipping ? shipping.price_cents > 0 : false;

  useEffect(() => {
    fetch('/api/shipping').then((r) => r.json()).then((d) => {
      setOptions(d.options || []);
      if (d.options?.[0]) setShippingId(d.options[0].id);
    });
  }, []);

  useEffect(() => {
    if (!ready || !items.length || !shippingId) return;
    fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload, shippingOptionId: shippingId }) })
      .then((r) => r.json()).then((d) => (d.error ? setError(d.error) : (setError(''), setQuote(d))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, items, shippingId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const { name, email, phone, ...address } = form;
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload, customer: { name, email, phone }, address, shippingOptionId: shippingId, notes }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Erro ao finalizar.'); setBusy(false); return; }
    clear();
    router.push(`/pedido/${d.publicId}`);
  }

  if (ready && items.length === 0) {
    return <section className="sec"><div className="wrap"><p>Seu carrinho está vazio. <Link href="/#produtos">Ver produtos</Link></p></div></section>;
  }

  return (
    <section className="sec">
      <div className="wrap">
        <h1 style={{ fontSize: '2rem' }}>Finalizar pedido</h1>
        <form className="grid2" onSubmit={submit}>
          <div className="f">
            <fieldset><legend>Seus dados</legend><div className="f">
              <label>Nome completo<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>
              <div className="row">
                <label>E-mail<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
                <label>WhatsApp<input type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" placeholder="81 99999-9999" /></label>
              </div>
            </div></fieldset>

            <fieldset><legend>Entrega</legend><div className="f">
              {options.map((o) => (
                <label key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--ink)' }}>
                  <input type="radio" name="ship" style={{ width: 'auto', marginTop: 6 }} checked={shippingId === o.id} onChange={() => setShippingId(o.id)} />
                  <span><strong>{o.name}</strong> — {o.price_cents ? formatBRL(o.price_cents) : 'grátis'}<br /><span className="muted" style={{ fontSize: '.9rem' }}>{o.description}</span></span>
                </label>
              ))}
              {needsAddress && (<>
                <div className="row">
                  <label>CEP<input value={form.zip} onChange={set('zip')} required autoComplete="postal-code" /></label>
                  <label>Estado (UF)<input value={form.state} onChange={set('state')} required maxLength={2} autoComplete="address-level1" /></label>
                </div>
                <label>Rua<input value={form.street} onChange={set('street')} required autoComplete="address-line1" /></label>
                <div className="row">
                  <label>Número<input value={form.number} onChange={set('number')} required /></label>
                  <label>Complemento<input value={form.complement} onChange={set('complement')} /></label>
                </div>
                <div className="row">
                  <label>Bairro<input value={form.district} onChange={set('district')} required /></label>
                  <label>Cidade<input value={form.city} onChange={set('city')} required autoComplete="address-level2" /></label>
                </div>
              </>)}
            </div></fieldset>
            <label>Observações do pedido<textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></label>
          </div>

          <aside className="panel">
            <h2 style={{ fontSize: '1.3rem' }}>Resumo</h2>
            {quote?.lines.map((l, i) => <div className="line" key={i}><span>{l.quantity}× {l.name}</span><span>{formatBRL(l.total_cents)}</span></div>)}
            {quote && (<>
              <div className="line"><span>Frete</span><span>{formatBRL(quote.totals.shipping_cents)}</span></div>
              <div className="line total"><span>Total</span><span>{formatBRL(quote.totals.total_cents)}</span></div>
            </>)}
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn wide" disabled={busy || !quote} type="submit">{busy ? 'Criando pedido…' : 'Criar pedido e pagar'}</button>
            <p className="muted" style={{ fontSize: '.88rem', marginTop: 12 }}>Você escolhe Pix ou cartão na próxima tela.</p>
          </aside>
        </form>
      </div>
    </section>
  );
}
