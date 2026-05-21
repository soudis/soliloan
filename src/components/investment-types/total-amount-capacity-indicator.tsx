'use client';

import { useTranslations } from 'next-intl';
import { DonutIndicator } from '@/components/ui/donut-indicator';
import { MAX_TOTAL_AMOUNT_EUR } from '@/lib/schemas/investment-type';
import { cn, formatCurrency } from '@/lib/utils';

interface Props {
  currentAmount?: number | null;
  size?: 'small' | 'default' | 'large' | 'xlarge';
  className?: string;
}

export function TotalAmountCapacityIndicator({ currentAmount, className, size = 'default' }: Props) {
  const t = useTranslations('dashboard.investmentTypes.capacity');

  const indicatorValue = currentAmount ?? 0;
  const isSmall = size === 'small';
  const isLarge = size === 'large' || size === 'xlarge';
  const isXLarge = size === 'xlarge';

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start',
        isSmall && 'gap-x-5 gap-y-3',
        isLarge && 'gap-x-6 gap-y-3',
        isXLarge && 'gap-x-8 gap-y-4',
        className,
      )}
    >
      <div className={cn('flex shrink-0 items-center self-center', isSmall && 'm-1')}>
        <DonutIndicator
          value={indicatorValue}
          limit={MAX_TOTAL_AMOUNT_EUR}
          className={cn(
            isXLarge ? 'h-48 w-48' : isLarge ? 'h-40 w-40' : isSmall ? 'h-20 w-20' : 'h-28 w-28',
          )}
        >
          <span className={cn('font-semibold', isXLarge ? 'text-xl' : isLarge ? 'text-lg' : 'text-sm')}>€</span>
        </DonutIndicator>
      </div>
      <div
        className={cn(
          'flex min-w-0 max-w-full shrink-0 flex-col justify-center self-center',
          isXLarge ? 'text-xl sm:text-2xl' : isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-base',
        )}
      >
        <p className="font-semibold tabular-nums">
          {currentAmount == null
            ? `Maximal ${formatCurrency(MAX_TOTAL_AMOUNT_EUR)}`
            : `${formatCurrency(currentAmount)} / ${formatCurrency(MAX_TOTAL_AMOUNT_EUR)}`}
        </p>
        <p className={cn('text-muted-foreground', isLarge && 'mt-0.5 text-base', isXLarge && 'text-lg')}>
          {t('totalAmount')}
        </p>
      </div>
    </div>
  );
}
