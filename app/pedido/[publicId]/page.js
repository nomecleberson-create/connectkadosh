import { Suspense } from 'react';
import Tracker from '@/components/Tracker';

export const metadata = { title: 'Acompanhar pedido — Connect Kadosh', robots: { index: false } };

export default function OrderPage({ params }) {
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <Suspense fallback={<p>Carregando pedido…</p>}><Tracker publicId={params.publicId} /></Suspense>
      </div>
    </section>
  );
}
