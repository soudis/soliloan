import { Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';

import './globals.css';

import type { Metadata } from 'next';
import { getSoliloanProjectName } from '@/lib/project-name';
import { Providers } from './providers';

const projectName = getSoliloanProjectName();

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const roboto = localFont({
  src: '../fonts/RobotoMono-VariableFont.woff2',
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: projectName,
  description: projectName,
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<Record<string, string | undefined>>;
}>) {
  const resolved = await params;
  const locale = typeof resolved?.locale === 'string' ? resolved.locale : 'de';
  return (
    <html lang={locale} suppressHydrationWarning className={`${plusJakarta.variable} ${roboto.variable}`}>
      <head>
        <link rel="icon" href="/soliloan-logo.webp" sizes="any" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
