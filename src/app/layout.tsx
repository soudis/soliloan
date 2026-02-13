import localFont from 'next/font/local';

import './globals.css';

import type { Metadata } from 'next';
import { ColorSchemeScript } from './color-scheme-script';
import { Providers } from './providers';

const inter = localFont({
  src: '../fonts/Inter-VariableFont.woff2',
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
});

const comfortaa = localFont({
  src: '../fonts/Comfortaa-VariableFont.woff2',
  variable: '--font-comfortaa',
  display: 'swap',
  preload: true,
});

const roboto = localFont({
  src: '../fonts/RobotoMono-VariableFont.woff2',
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Direktkreditplattform',
  description: 'Direktkreditplattform',
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: { locale?: string };
}>) {
  return (
    <html
      lang={params?.locale || 'en'}
      suppressHydrationWarning
      className={`${inter.className} ${inter.variable} ${comfortaa.variable} ${roboto.variable}`}
    >
      <head>
        <link rel="icon" href="/soliloan-logo.webp" sizes="any" />
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
