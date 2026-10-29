import { notFound } from 'next/navigation';
import { LenderDashboard } from '@/components/lender-dashboard/lender-dashboard';
import { getLendersByUser } from '@/lib/lenders/get-lenders-by-user';
import { requireSession } from '@/lib/require-session';

export default async function MyLoansPage() {
  const session = await requireSession();
  const result = await getLendersByUser();
  if ('error' in result) {
    notFound();
  }

  const loans = result.lenders.flatMap((lender) => lender.loans);
  const userName = session?.user?.name?.trim() || session?.user?.email || null;

  return <LenderDashboard loans={loans} aggregates={result.aggregates} userName={userName} />;
}
