import { Comfortaa, Inter } from 'next/font/google';

import './globals.css';
import { Providers } from './providers';

import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-comfortaa',
});

export const metadata: Metadata = {
  title: 'SoliLoans AI',
  description: 'AI-powered loan management system',
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: { locale?: string };
}>) {
  return (
    <html lang={params?.locale || 'en'} suppressHydrationWarning className={`${inter.variable} ${comfortaa.variable}`}>
      <head>
        <link rel="icon" href="/soliloan-logo.webp" sizes="any" />
      </head>
      <body className={`font-sans ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
