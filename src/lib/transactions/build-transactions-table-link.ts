import { PROJECT_ID_KEY } from '@/lib/params';

function formatDateForTransactionUrl(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildTransactionsTableHrefForHistoryPeriod(options: {
  periodStart: Date;
  periodEnd: Date;
  projectId?: string | null;
}): string {
  const params = new URLSearchParams();

  if (options.projectId) {
    params.set(PROJECT_ID_KEY, options.projectId);
  }

  params.set('txRange', 'custom');
  params.set('txRangeFrom', formatDateForTransactionUrl(options.periodStart));
  params.set('txRangeTo', formatDateForTransactionUrl(options.periodEnd));

  return `/transactions?${params.toString()}`;
}
