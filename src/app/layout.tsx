import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';
import ServiceWorker from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'App Mãe',
  description: 'Saúde, escola e compromissos dos filhos num lugar só, da gestação até a escola. Versão de teste.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'App Mãe', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7A1F4B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <Shell>{children}</Shell>
        <ServiceWorker />
        <noscript>Este app precisa de JavaScript para funcionar.</noscript>
      </body>
    </html>
  );
}
