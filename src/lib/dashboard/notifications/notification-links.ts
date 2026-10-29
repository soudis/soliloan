import { PROJECT_ID_KEY } from '@/lib/params';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';

const OPEN_LOAN_STATUSES = ['ACTIVE', 'TERMINATED', 'NOTDEPOSITED'] as const;

export function repayOverdueDateFilter() {
  return { operator: 'olderThan' as const, amount: 1, unit: 'days' as const };
}

export function repaySoonDateFilter(days: number) {
  return { operator: 'next' as const, amount: days, unit: 'days' as const };
}

export function openLoanStatusFilter() {
  return { operator: 'in' as const, values: [...OPEN_LOAN_STATUSES] };
}

function listHref(path: string, projectId: string, filters: { id: string; value: unknown }[]) {
  const params = new URLSearchParams();
  params.set(PROJECT_ID_KEY, projectId);
  params.set('fe', 'true');
  params.set('filters', btoa(JSON.stringify(filters)));
  return `${path}?${params.toString()}`;
}

export function loansListHref(projectId: string, filters: { id: string; value: unknown }[]): string {
  return listHref(TABLE_LIST_PATHS.loans, projectId, filters);
}

export function investmentTypesListHref(projectId: string): string {
  return listHref(TABLE_LIST_PATHS.investmentTypes, projectId, [
    { id: 'freeCapacity', value: { operator: 'lt', value: 0 } },
  ]);
}

export function processesYearHref(projectId: string, year: number): string {
  const params = new URLSearchParams();
  params.set(PROJECT_ID_KEY, projectId);
  params.set('year', String(year));
  return `/processes?${params.toString()}`;
}

export function bankImportHref(projectId: string): string {
  const params = new URLSearchParams();
  params.set(PROJECT_ID_KEY, projectId);
  return `/transactions/import?${params.toString()}`;
}

export function lenderHref(projectId: string, lenderId: string): string {
  const params = new URLSearchParams();
  params.set(PROJECT_ID_KEY, projectId);
  return `/lenders/${lenderId}?${params.toString()}`;
}
