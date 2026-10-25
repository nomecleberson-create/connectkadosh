'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/status';

export default function CartPage() {
  const { items, ready, setQty, remove } = useCart();
  const subtotal = items.reduce((s, i) => s + i.unit_cents * i.quantity, 0);
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: '2rem' }}>Carrinho</h1>
        {ready && items.length === 0 && (
          <div className="panel"><p>Seu carrinho está vazio.</p><Link className="btn" href="/#produtos">Ver produtos</Link></div>
        )}
        {items.map((i) => (
          <div className="cartitem" key={i.lineId}>
            <div>
              <strong>{i.name}</strong>
              <div className="muted" style={{ fontSize: '.9rem' }}>
                {Object.keys(i.customization || {}).filter((k) => i.customization[k]).length} campo(s) de personalização
              </div>
              <button className="linkbtn" onClick={() => remove(i.lineId)}>Remover</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="qty">
                <button aria-label="Diminuir" onClick={() => setQty(i.lineId, i.quantity - 1)}>−</button>
                <span>{i.quantity}</span>
                <button aria-label="Aumentar" onClick={() => setQty(i.lineId, i.quantity + 1)}>+</button>
              </div>
              <div>{formatBRL(i.unit_cents * i.quantity)}</div>
            </div>
          </div>
        ))}
        {items.length > 0 && (
          <>
            <div className="line total"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
            <p className="muted">O frete é escolhido na próxima etapa. O valor final é conferido pelo servidor.</p>
            <Link className="btn wide" href="/checkout">Continuar para o checkout</Link>
          </>
        )}
      </div>
    </section>
  );
}
