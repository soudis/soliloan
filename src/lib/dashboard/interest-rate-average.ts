import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanMonthlyNumbers } from '@/types/dashboard';

/**
 * Weight for `interestRateAvg` across every dashboard widget.
 *
 * Compound loans are weighted by outstanding balance. Non-compound loans are
 * weighted by the interest base, because unpaid interest sits in the balance
 * without earning interest. A repaid loan has no balance, so its weight is 0
 * and it stays out of the average.
 */
export function interestRateAverageWeight(
  loan: DashboardLoan,
  numbers: Pick<LoanMonthlyNumbers, 'end' | 'interestBaseAmount'>,
): number {
  if (numbers.end <= 0) {
    return 0;
  }
  if (loan.interestMethod.split('_')[2] === 'COMPOUND') {
    return numbers.end;
  }
  return numbers.interestBaseAmount;
}
