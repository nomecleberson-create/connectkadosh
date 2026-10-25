import Link from 'next/link';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/status';
import { whatsappLink } from '@/lib/whatsapp';

export const revalidate = 60;

async function getProducts() {
  try {
    const { data } = await db().from('products').select('slug,name,description,price_cents,image_url').eq('active', true).order('created_at');
    return data || [];
  } catch { return null; }
}

const faq = [
  ['Preciso de aplicativo para ler a tag?', 'Não. A maioria dos celulares lê NFC ao aproximar a tag, e qualquer câmera abre o QR Code.'],
  ['Posso trocar o link depois?', 'A tag é gravada com o link que você informa no pedido. Para mudar, fale com a gente pelo WhatsApp.'],
  ['Que links posso usar?', 'Instagram, WhatsApp, Wi-Fi, avaliações do Google, Pix, site, portfólio ou outro link.'],
  ['Como acompanho meu pedido?', 'Depois da compra você recebe um link seguro com o status em tempo real, do pagamento à entrega.'],
  ['Quais formas de pagamento?', 'Pix e cartão, pelo Mercado Pago. Os dados do cartão ficam na página segura do Mercado Pago, não passam por aqui.'],
];

export default async function Home() {
  const products = await getProducts();
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Seu link a um toque de distância.</h1>
            <p className="lead">Tags NFC + QR Code plastificadas, personalizadas com o seu Instagram, WhatsApp, Wi-Fi ou avaliações do Google. O cliente aproxima o celular e pronto.</p>
            <div className="cta">
              <Link className="btn" href="/#produtos">Comprar minha tag</Link>
              <a className="btn ghost" href={whatsappLink('Olá! Quero tirar uma dúvida sobre as tags NFC.')} target="_blank" rel="noopener noreferrer">Tirar dúvidas</a>
            </div>
          </div>
          <div className="tagdemo">
            <div className="rings" aria-hidden="true"><i /><i /><i /></div>
            <img src="/logo.png" alt="Connect Kadosh — Tecnologia, Personalização e Conexão" width="810" height="460" />
          </div>
        </div>
      </section>

      <section className="sec" id="como-funciona">
        <div className="wrap">
          <h2>Como funciona</h2>
          <ol className="steps">
            <li><h3>Você escolhe o link</h3><p className="muted">Informa no pedido o que a tag deve abrir: perfil, WhatsApp, Wi-Fi, avaliação ou site.</p></li>
            <li><h3>A gente personaliza</h3><p className="muted">Gravamos o NFC e imprimimos o QR Code na tag plastificada.</p></li>
            <li><h3>Seu cliente aproxima</h3><p className="muted">Basta encostar o celular na tag ou ler o QR Code com a câmera.</p></li>
          </ol>
          <ul className="uses" aria-label="Usos">
            {['Instagram', 'WhatsApp', 'Wi-Fi', 'Avaliações do Google', 'Pix', 'Site e portfólio'].map((u) => <li key={u}>{u}</li>)}
          </ul>
        </div>
      </section>

      <section className="sec" id="produtos">
        <div className="wrap">
          <h2>Produtos</h2>
          {products === null && <p className="err">Catálogo indisponível no momento. Fale com a gente pelo WhatsApp.</p>}
          {products?.length === 0 && <p className="muted">Nenhum produto cadastrado ainda.</p>}
          {products?.map((p) => (
            <div className="product" key={p.slug} style={{ marginBottom: 20 }}>
              <div className="ph">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <img src="/logo-mark.png" alt="" width="160" style={{ width: 160, height: 'auto', objectFit: 'contain' }} />}</div>
              <div>
                <h3 style={{ fontSize: '1.5rem' }}>{p.name}</h3>
                <p className="muted">{p.description}</p>
                <p className="price">{formatBRL(p.price_cents)} <small>por unidade</small></p>
                <Link className="btn" href={`/produtos/${p.slug}`}>Personalizar e comprar</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" id="duvidas">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <h2>Dúvidas frequentes</h2>
          {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>
    </>
  );
}
