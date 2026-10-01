import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanStartedOnOrBefore } from '@/lib/calculations/loan-duration-metrics';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';

import { getFilterDefinitionForField, isDynamicLoanFilterField } from './filter-definitions';
import { matchesFilterByType } from './filter-matchers';
import { getLoanFilterValue, type PeriodSnapshot } from './get-filter-value';

export type LoanFilterContext = {
  periodEnd: Date;
  periodStart: Date;
  snapshot: PeriodSnapshot | null;
  commonT: (key: string, values?: Record<string, string>) => string;
  referenceDate: Date;
};

export function loanMatchesFilters(
  loan: DashboardLoan,
  filters: EntityFilter[],
  context: LoanFilterContext,
  fieldOptions: EntityFilterFieldOption[],
): boolean {
  if (!loanStartedOnOrBefore(loan, context.periodEnd)) {
    return false;
  }

  for (const filter of filters) {
    if (filter.entity === 'transaction') {
      continue;
    }
    const definition = getFilterDefinitionForField(fieldOptions, filter.entity, filter.field);
    if (!definition) {
      continue;
    }

    const useSnapshot = filter.entity === 'loan' && isDynamicLoanFilterField(filter.field);

    const snapshot = useSnapshot ? context.snapshot : null;
    const value = getLoanFilterValue(loan, filter.entity, filter.field, snapshot, context.commonT);

    if (!matchesFilterByType(value, filter.value, definition.type, { referenceDate: context.referenceDate })) {
      return false;
    }
  }

  return true;
}
