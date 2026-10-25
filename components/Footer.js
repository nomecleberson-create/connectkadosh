import { whatsappLink } from '@/lib/whatsapp';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <strong style={{ color: 'var(--ink)' }}>Connect Kadosh</strong>
          <p>Tecnologia, Personalização e Conexão.</p>
        </div>
        <div>
          <p><a href="https://instagram.com/connect_kadosh" target="_blank" rel="noopener noreferrer">Instagram @connect_kadosh</a></p>
          <p><a href={whatsappLink('Olá! Vim pelo site da Connect Kadosh.')} target="_blank" rel="noopener noreferrer">WhatsApp +55 81 9542-7772</a></p>
        </div>
        <div>
          <p><a href="/pedido">Consultar um pedido</a></p>
          <p className="muted">Políticas de troca e privacidade: veja o checklist de publicação.</p>
        </div>
      </div>
    </footer>
  );
}
