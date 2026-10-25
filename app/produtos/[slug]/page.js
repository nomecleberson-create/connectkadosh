import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import ProductForm from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { data: p } = await db().from('products').select('id,slug,name,description,price_cents,stock').eq('slug', params.slug).eq('active', true).maybeSingle();
  if (!p) notFound();
  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <ProductForm product={p} />
      </div>
    </section>
  );
}
