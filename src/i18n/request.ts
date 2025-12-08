import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Load all translation files from the locale directory
  // biome-ignore lint/suspicious/noImplicitAnyLet: needed
  let messages;
  try {
    messages = (await import(`../messages/${locale}`)).default;
  } catch (error) {
    // Fallback to default locale if requested locale is not available
    messages = (await import(`../messages/${routing.defaultLocale}`)).default;
    console.error(error);
  }

  return {
    locale,
    messages,
  };
});
