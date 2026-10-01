import { PROJECT_ID_KEY } from '@/lib/params';

/** Opens the transactions list filtered to interest payouts in the given calendar year. */
export function buildYearlyInterestPayoutHref(projectId: string, year: number): string {
  const params = new URLSearchParams();
  params.set(PROJECT_ID_KEY, projectId);
  params.set('txRange', 'custom');
  params.set('txRangeFrom', `${year}-01-01`);
  params.set('txRangeTo', `${year}-12-31`);
  params.set('fe', 'true');
  const filters = [
    {
      id: 'transaction.type',
      value: { operator: 'in', values: ['INTERESTPAYMENT'] },
    },
  ];
  params.set('filters', btoa(JSON.stringify(filters)));
  return `/transactions/list?${params.toString()}`;
}
