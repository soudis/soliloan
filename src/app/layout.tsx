import localFont from 'next/font/local';

import './globals.css';
import { Providers } from './providers';

import type { Metadata } from 'next';

const inter = localFont({
  src: '../fonts/Inter-VariableFont_opsz,wght.ttf',
  variable: '--font-inter',
});

const comfortaa = localFont({
  src: '../fonts/Comfortaa-VariableFont_wght.ttf',
  variable: '--font-comfortaa',
});

const roboto = localFont({
  src: '../fonts/RobotoMono-VariableFont_wght.ttf',
  variable: '--font-mono',
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
      className={`${inter.variable} ${comfortaa.variable} ${roboto.variable}`}
    >
      <head>
        <link rel="icon" href="/soliloan-logo.webp" sizes="any" />
      </head>
      <body className={`font-sans ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
