import type { SoliLoansTheme } from '@prisma/client';

export const SOLI_LOANS_THEME = {
  default: 'default',
  ocean: 'ocean',
  forest: 'forest',
  sunset: 'sunset',
  lavender: 'lavender',
} as const satisfies Record<SoliLoansTheme, SoliLoansTheme>;
