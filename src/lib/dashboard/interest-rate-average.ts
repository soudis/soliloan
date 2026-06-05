import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';

/**
 * Single source of truth for `interestRateAvg` weighting across every dashboard widget
 * (stat widget, history table, bar/line charts, pie chart).
 *
 * Each loan's interest rate is weighted by its contract amount so that averages,
 * totals and charts agree on the same dataset.
 */
export function interestRateAverageWeight(loan: DashboardLoan): number {
  return Number(loan.amount);
}
