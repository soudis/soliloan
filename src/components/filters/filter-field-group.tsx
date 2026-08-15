import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type FilterFieldVariant = 'row' | 'stacked';
export type FilterFieldSize = 'default' | 'sm';

const horizontalFusionClass =
  '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none';

const verticalFusionClass =
  '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none';

export function FilterFieldGroup({
  children,
  className,
  orientation = 'horizontal',
}: {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <fieldset
      className={cn(
        'm-0 min-w-0 border-0 p-0',
        'flex w-full items-stretch [&>*]:focus-visible:relative [&>*]:focus-visible:z-10',
        orientation === 'vertical' ? cn('flex-col', verticalFusionClass) : cn('flex-row', horizontalFusionClass),
        className,
      )}
    >
      {children}
    </fieldset>
  );
}

/** Operator on its own rounded row; value inputs fused on a second row below. */
export function FilterStackedFields({
  operator,
  payload,
}: {
  operator: ReactNode;
  payload: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {operator}
      {payload ? <FilterFieldGroup className="min-w-0">{payload}</FilterFieldGroup> : null}
    </div>
  );
}

function filterSizeClass(size: FilterFieldSize) {
  // Override Input/SelectTrigger `text-base md:text-sm` at all breakpoints.
  return size === 'sm' ? 'h-8 text-xs md:text-xs' : 'h-9';
}

export function filterOperatorSegmentClass(size: FilterFieldSize = 'default', fullWidth = false) {
  return cn(
    'gap-1 shadow-none',
    fullWidth ? 'w-full' : 'w-auto shrink-0',
    size === 'sm' ? 'h-8 px-2 text-xs md:text-xs' : 'h-9 px-3',
    '[&>span]:line-clamp-none [&>span]:whitespace-nowrap',
  );
}

export function filterInputSegmentClass(
  size: FilterFieldSize = 'default',
  width: 'amount' | 'year' = 'amount',
) {
  return cn(
    'shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    filterSizeClass(size),
    width === 'amount' ? 'w-14 shrink-0' : 'w-24 shrink-0',
  );
}

export function filterDateSegmentClass(variant: FilterFieldVariant, size: FilterFieldSize = 'default') {
  return cn(
    'min-w-0 justify-start px-2 text-left font-normal shadow-none',
    variant === 'stacked' ? 'flex-1' : 'w-[7.25rem] shrink',
    filterSizeClass(size),
  );
}

export function filterUnitSegmentClass(size: FilterFieldSize = 'default') {
  return cn('w-[100px] shrink-0 shadow-none', filterSizeClass(size));
}

export function filterValueSegmentClass(size: FilterFieldSize = 'default') {
  return cn(
    'min-w-0 flex-1 shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    filterSizeClass(size),
  );
}

/** Comparison symbols (=, >, <, …) read small at default select size. */
export const FILTER_SYMBOL_OPERATORS = new Set(['eq', 'gt', 'lt', 'gte', 'lte']);

export function filterSymbolOperatorLabelClass(operator: string, size: FilterFieldSize = 'default') {
  if (!FILTER_SYMBOL_OPERATORS.has(operator) || size === 'sm') {
    return undefined;
  }
  return 'text-lg leading-none';
}

export function filterSymbolOperatorTriggerClass(operator: string, size: FilterFieldSize = 'default') {
  if (!FILTER_SYMBOL_OPERATORS.has(operator) || size === 'sm') {
    return undefined;
  }
  return 'text-lg';
}
