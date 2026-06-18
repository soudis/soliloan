import moment from 'moment';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';

import { getFilterDefinitionForField, isDynamicLoanFilterField } from './filter-definitions';
import { matchesFilterByType } from './filter-matchers';
import { getLoanFilterValue, type PeriodSnapshot } from './get-filter-value';

export type LoanFilterContext = {
  periodEnd: Date;
  periodStart: Date;
  snapshot: PeriodSnapshot | null;
  commonT: (key: string, values?: Record<string, string>) => string;
};

export function loanMatchesFilters(
  loan: DashboardLoan,
  filters: EntityFilter[],
  context: LoanFilterContext,
  fieldOptions: EntityFilterFieldOption[],
): boolean {
  if (moment(loan.signDate).isAfter(context.periodEnd, 'day')) {
    return false;
  }

  for (const filter of filters) {
    const definition = getFilterDefinitionForField(fieldOptions, filter.entity, filter.field);
    if (!definition) {
      continue;
    }

    const useSnapshot = filter.entity === 'loan' && isDynamicLoanFilterField(filter.field);

    const snapshot = useSnapshot ? context.snapshot : null;
    const value = getLoanFilterValue(loan, filter.entity, filter.field, snapshot, context.commonT);

    if (!matchesFilterByType(value, filter.value, definition.type)) {
      return false;
    }
  }

  return true;
}
