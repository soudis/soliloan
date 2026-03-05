import { getDashboardStats } from '@/actions/dashboard/get-dashboard-stats';
import { getLoansByProjectUnsafe } from '@/actions/loans/queries/get-loans-by-project';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { auth } from '@/lib/auth';
import { searchParamsCache } from '@/lib/params';
import type { LoanWithCalculations } from '@/types/loans';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Calculate loan amount distribution on the server
function calculateLoanAmountDistribution(loans: LoanWithCalculations[]) {
  const ranges = [
    { min: 0, max: 1000, label: '0 - 1,000' },
    { min: 1001, max: 5000, label: '1,001 - 5,000' },
    { min: 5001, max: 10000, label: '5,001 - 10,000' },
    { min: 10001, max: 25000, label: '10,001 - 25,000' },
    { min: 25001, max: 50000, label: '25,001 - 50,000' },
    { min: 50001, max: 100000, label: '50,001 - 100,000' },
    { min: 100001, max: Number.POSITIVE_INFINITY, label: '100,001+' },
  ];

  const distribution = ranges.map((range) => ({
    range: range.label,
    count: 0,
    totalAmount: 0,
  }));

  for (const loan of loans) {
    const amount = Number(loan.amount);
    const rangeIndex = ranges.findIndex((range) => amount >= range.min && amount <= range.max);
    if (rangeIndex !== -1) {
      distribution[rangeIndex].count++;
      distribution[rangeIndex].totalAmount += amount;
    }
  }

  return distribution.filter((item) => item.count > 0);
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);
  const session = await auth();

  const [statsResult, loansResult] = await Promise.all([
    getDashboardStats(projectId),
    getLoansByProjectUnsafe(projectId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsData = statsResult.error ? null : (statsResult.stats ?? null);
  const loans = loansResult.loans ?? [];
  const loansDistribution = calculateLoanAmountDistribution(loans);

  return (
    <DashboardContent
      statsData={statsData}
      loansDistribution={loansDistribution}
      loans={loans}
      userName={session?.user?.name || 'User'}
    />
  );
}
