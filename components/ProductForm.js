'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/status';

const FIELDS = [
  ['instagram', 'Instagram', '@seu_perfil ou link'],
  ['whatsapp', 'WhatsApp', 'Ex.: 81 99999-9999'],
  ['google_review', 'Avaliações do Google', 'Link da sua página de avaliação'],
  ['site', 'Site, portfólio ou outro link', 'https://...'],
  ['pix', 'Pix (chave ou link de pagamento)', 'Opcional'],
];

export default function ProductForm({ product }) {
  const { add } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [data, setData] = useState({});
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    add({ productId: product.id, name: product.name, unit_cents: product.price_cents, quantity, customization: data });
    router.push('/carrinho');
  }

  return (
    <form className="f" onSubmit={submit}>
      <h1 style={{ fontSize: '2rem' }}>{product.name}</h1>
      <p className="muted">{product.description}</p>
      <p className="price">{formatBRL(product.price_cents)} <small>por unidade</small></p>

      <label>Quantidade
        <input type="number" min="1" max={product.stock ?? 500} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} required />
      </label>

      <fieldset>
        <legend>O que a tag deve abrir?</legend>
        <div className="f">
          {FIELDS.map(([k, label, ph]) => (
            <label key={k}>{label}<input value={data[k] || ''} onChange={set(k)} placeholder={ph} maxLength={300} /></label>
          ))}
          <div className="row">
            <label>Nome do Wi-Fi<input value={data.wifi_name || ''} onChange={set('wifi_name')} maxLength={100} /></label>
            <label>Senha do Wi-Fi<input value={data.wifi_password || ''} onChange={set('wifi_password')} maxLength={100} autoComplete="off" /></label>
          </div>
          <label>Observações<textarea rows="3" value={data.notes || ''} onChange={set('notes')} maxLength={300} placeholder="Cores, texto na tag, vários links, etc." /></label>
        </div>
      </fieldset>
      <p className="muted" style={{ fontSize: '.9rem' }}>Preencha só o que for usar. Se a mesma tag for para vários links, descreva nas observações.</p>
      <button className="btn wide" type="submit">Adicionar ao carrinho</button>
    </form>
  );
}
