import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['de'],

  // Used when no locale matches
  defaultLocale: 'de',
  localeDetection: false,
});

export const LOCALES = ['de'] as const;
