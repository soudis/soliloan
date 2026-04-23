'use client';

import { useTranslations } from 'next-intl';
import { GridIndicator5x4 } from '@/components/ui/grid-indicator-5x4';
import { MAX_UNITS } from '@/lib/schemas/investment-type';
import { cn } from '@/lib/utils';

interface Props {
  currentUnits?: number | null;
  /** `large` für Detailseite, `xlarge` z. B. für prominente Formularanzeige. */
  size?: 'default' | 'large' | 'xlarge';
  className?: string;
}

export function NotMoreThanNUnitsCapacityIndicator({ currentUnits, size = 'default', className }: Props) {
  const t = useTranslations('dashboard.investmentTypes.capacity');

  const indicatorValue = currentUnits ?? 0;
  const isLarge = size === 'large' || size === 'xlarge';
  const isXLarge = size === 'xlarge';
  const containerGapClass = isXLarge ? 'gap-x-8 gap-y-4' : isLarge ? 'gap-x-6 gap-y-3' : undefined;
  const indicatorOuterSizeClass = isXLarge ? 'h-48 w-48' : isLarge ? 'h-40 w-40' : 'h-28 w-24';
  const indicatorInnerSizeClass = isXLarge ? 'h-48 w-[10.286rem]' : isLarge ? 'h-40 w-[8.571rem]' : 'h-28 w-24';
  const gridGapClass = isXLarge ? 'gap-2' : isLarge ? 'gap-1.5' : undefined;
  const valueTextClass = isXLarge ? 'text-xl sm:text-2xl' : isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-base';
  const unitsTextClass = isXLarge ? 'mt-0.5 text-lg' : isLarge ? 'mt-0.5 text-base' : undefined;

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start',
        containerGapClass,
        className,
      )}
    >
      <div className={cn('mb-4 shrink-0', indicatorOuterSizeClass)}>
        <div className={cn('shrink-0', indicatorInnerSizeClass)}>
          <GridIndicator5x4 value={indicatorValue} className={cn('h-full w-full', gridGapClass)} />
        </div>
      </div>
      <div className={cn('min-w-0 max-w-full shrink-0', valueTextClass)}>
        <p className="font-semibold tabular-nums">
          {currentUnits == null ? `Maximal ${MAX_UNITS}` : `${currentUnits} / ${MAX_UNITS}`}
        </p>
        <p className={cn('text-muted-foreground', unitsTextClass)}>{t('units')}</p>
      </div>
    </div>
  );
}
