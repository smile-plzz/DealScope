import type { Metadata, Viewport } from 'next';
import { Shell } from '@/components/shell';
import '@fontsource/noto-sans-bengali/bengali-400.css';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'DealScope — A clearer way to shop', template: '%s | DealScope' },
  description:
    'Compare Bangladesh seller offers with clear prices, delivery costs and evidence. Manual-first limited beta.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'DealScope', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#156e55' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
