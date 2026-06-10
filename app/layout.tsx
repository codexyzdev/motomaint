import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { ToastProvider } from '@/components/ui/useToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MotoMaint',
  description: 'Registra y rastrea el mantenimiento de tu motocicleta',
  appleWebApp: {
    capable: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
        <ErrorBoundary>
          <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
