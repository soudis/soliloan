import type { DashboardLender } from '@/actions/dashboard/get-dashboard-stats';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';

import { getFilterDefinitionForField } from './filter-definitions';
import { matchesFilterByType } from './filter-matchers';
import { getLenderFilterValue } from './get-lender-filter-value';

export function lenderMatchesFilters(
  lender: DashboardLender,
  filters: EntityFilter[],
  fieldOptions: EntityFilterFieldOption[],
): boolean {
  for (const filter of filters) {
    const definition = getFilterDefinitionForField(fieldOptions, filter.entity, filter.field);
    if (!definition) {
      continue;
    }

    const value = getLenderFilterValue(lender, filter.field);
    if (!matchesFilterByType(value, filter.value, definition.type)) {
      return false;
    }
  }

  return true;
}
