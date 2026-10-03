import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartHydration } from '@/components/CartHydration';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Lolita Bakery — Venezuelan Bites, Made with Love',
  description:
    'Order fresh Venezuelan arepas, empanadas, tequeños, and custom sweet boxes from Lolita Bakery. Delivery and pickup available.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable}`}>
      <body className={plusJakartaSans.className}>
        <AuthProvider>
          <CartHydration />
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1.5px solid var(--border)',
              color: 'var(--foreground)',
              borderRadius: '10px',
              fontFamily: 'var(--font-plus-jakarta-sans), sans-serif',
            },
          }}
        />
</body>
    </html>
  );
}