'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { whatsappLink } from '@/lib/whatsapp';

export default function Lookup() {
  const [code, setCode] = useState('');
  const router = useRouter();
  const go = (e) => {
    e.preventDefault();
    const id = code.trim().split('/').pop();
    if (id) router.push(`/pedido/${encodeURIComponent(id)}`);
  };
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: '2rem' }}>Consultar pedido</h1>
        <p className="muted">Cole o link ou o código de acompanhamento que você recebeu ao finalizar a compra.</p>
        <form className="f" onSubmit={go}>
          <label>Código do pedido<input value={code} onChange={(e) => setCode(e.target.value)} required /></label>
          <button className="btn wide" type="submit">Ver pedido</button>
        </form>
        <p style={{ marginTop: 20 }}><a href={whatsappLink('Olá! Perdi o link de acompanhamento do meu pedido.')} target="_blank" rel="noopener noreferrer">Perdeu o link? Fale conosco no WhatsApp</a></p>
      </div>
    </section>
  );
}
