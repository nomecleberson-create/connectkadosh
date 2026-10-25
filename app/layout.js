import './globals.css';
import { Sora, Source_Sans_3 } from 'next/font/google';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const display = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Connect Kadosh — Tags NFC + QR Code personalizadas',
  description: 'Tecnologia, Personalização e Conexão. Tags NFC + QR Code plastificadas com os seus links.',
  icons: { icon: '/logo-mark.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppFloat />
        </CartProvider>
      </body>
    </html>
  );
}
