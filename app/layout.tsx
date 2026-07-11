import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-atal', display: 'swap' });

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
      <body className={manrope.variable} suppressHydrationWarning>{children}</body>
    </html>
  );
}
