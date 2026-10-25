'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart';

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand" onClick={close}>
          <img src="/logo-mark.png" alt="" width="57" height="42" />
          <span>Connect Kadosh</span>
        </Link>
        <button className="burger" aria-expanded={open} aria-label="Abrir menu" onClick={() => setOpen(!open)}>Menu</button>
        <nav className={'nav' + (open ? ' open' : '')} aria-label="Principal">
          <Link href="/#como-funciona" onClick={close}>Como funciona</Link>
          <Link href="/#produtos" onClick={close}>Produtos</Link>
          <Link href="/#duvidas" onClick={close}>Dúvidas</Link>
          <Link href="/pedido" onClick={close}>Meu pedido</Link>
          <Link href="/carrinho" className="cartlink" onClick={close} aria-label={`Carrinho, ${count} itens`}>
            Carrinho{count > 0 && <b>{count}</b>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
