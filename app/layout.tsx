import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-atal', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atal Fisioterapia',
  description: 'Gestión clínica para fisioterapeutas',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className={poppins.variable} suppressHydrationWarning>{children}</body>
    </html>
  );
}
