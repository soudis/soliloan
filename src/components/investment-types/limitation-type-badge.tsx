'use client';

import type { LimitationType } from '@prisma/client';
import { Circle, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import { cn } from '@/lib/utils';

interface Props {
  limitationType: LimitationType;
  className?: string;
}

export function LimitationTypeBadge({ limitationType, className }: Props) {
  const commonT = useTranslations('common');

  const label =
    limitationType === 'NOT_MORE_THAN_N_UNITS'
      ? commonT('enums.limitationType.NOT_MORE_THAN_N_UNITS', { limit: MAX_UNITS })
      : commonT('enums.limitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD', {
          limit: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(MAX_TOTAL_AMOUNT_EUR),
          timePeriod: `${PERIOD_MONTHS} Monate`,
        });

  const Icon = limitationType === 'NOT_MORE_THAN_N_UNITS' ? Square : Circle;

  return (
    <Badge variant="secondary" className={cn('inline-flex max-w-full items-center gap-1.5 font-normal', className)}>
      <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2]" aria-hidden />
      <span className="min-w-0 break-words text-left leading-snug">{label}</span>
    </Badge>
  );
}
