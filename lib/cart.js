'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const Ctx = createContext(null);
const KEY = 'ck_cart_v1';

// Carrinho persistente no navegador. Só guarda produto, quantidade e personalização:
// o preço mostrado é informativo e o servidor recalcula tudo no pedido.
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { setItems([]); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }
  }, [items, ready]);

  const add = useCallback((item) => setItems((c) => [...c, { ...item, lineId: crypto.randomUUID() }]), []);
  const setQty = useCallback((lineId, q) => setItems((c) => c.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.max(1, Math.min(500, q)) } : i))), []);
  const remove = useCallback((lineId) => setItems((c) => c.filter((i) => i.lineId !== lineId)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, ready, add, setQty, remove, clear, count }}>{children}</Ctx.Provider>;
}
export const useCart = () => useContext(Ctx);
