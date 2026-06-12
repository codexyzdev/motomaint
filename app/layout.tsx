import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { ToastProvider } from '@/components/ui/useToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SyncProvider } from '@/components/SyncProvider';
import { Providers } from './providers';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'MotoMaint - Cuaderno de Inspección de Motocicleta',
    template: '%s | MotoMaint',
  },
  description: 'Registra y rastrea el mantenimiento de tu motocicleta. Controla aceite, calibración y revisiones con sellos de estado.',
  keywords: ['mantenimiento motocicleta', 'cuaderno servicio', 'control aceite', 'revisiones moto', 'taller mecánico'],
  authors: [{ name: 'MotoMaint' }],
  creator: 'MotoMaint',
  publisher: 'MotoMaint',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MotoMaint',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://motomaint.vercel.app',
    siteName: 'MotoMaint',
    title: 'MotoMaint - Cuaderno de Inspección de Motocicleta',
    description: 'Registra y rastrea el mantenimiento de tu motocicleta',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MotoMaint',
  description: 'Registra y rastrea el mantenimiento de tu motocicleta',
  url: 'https://motomaint.vercel.app',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://motomaint.vercel.app',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} antialiased`}
      suppressHydrationWarning
    >
<body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <ErrorBoundary>
            <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
              <ToastProvider>
                <SyncProvider />
                {children}
              </ToastProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
