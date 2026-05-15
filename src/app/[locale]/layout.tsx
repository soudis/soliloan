import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { SiteFooter } from '@/components/site-footer/site-footer';
import { Toaster } from '@/components/ui/sonner';
import { LOCALES } from '@/i18n/routing';
import { auth } from '@/lib/auth';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // biome-ignore lint/suspicious/noImplicitAnyLet: needed
  let messages;
  try {
    messages = (await import(`../../messages/${locale}`)).default;
  } catch (error) {
    console.error(error);
    notFound();
  }

  const session = await auth();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {session ? null : <SiteFooter />}
      </div>
      <Toaster />
    </NextIntlClientProvider>
  );
}
