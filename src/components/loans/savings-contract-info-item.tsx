'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { InfoItem } from '@/components/ui/info-item';
import { resolveSavingsFirstDepositDate, resolveSavingsLastDepositDate } from '@/lib/loans/savings-contract';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

interface SavingsContractInfoItemProps {
  loan: LoanDetailsWithCalculations;
  className?: string;
}

export function SavingsContractInfoItem({ loan, className }: SavingsContractInfoItemProps) {
  const t = useTranslations('dashboard.loans');
  const locale = useLocale();

  const firstDepositDate = resolveSavingsFirstDepositDate(loan.savingsFirstDepositDate, loan.signDate);
  const lastDepositDate = resolveSavingsLastDepositDate(
    loan.savingsFirstDepositDate,
    loan.savingsLastDepositDate,
    loan.savingsDepositCount,
    loan.signDate,
  );

  const outstandingSinceDays = loan.outstandingDepositsCount > 0 ? loan.outstandingDepositSinceDays : null;
  const isOutstanding = outstandingSinceDays !== null;
  const paymentStatus = isOutstanding
    ? outstandingSinceDays > 0
      ? t('table.paymentOutstandingSince', { days: outstandingSinceDays })
      : t('table.paymentOutstanding')
    : t('table.paymentNotOutstanding');

  const rates =
    loan.savingsDepositCount == null ? null : t('table.savingsContractRates', { months: loan.savingsDepositCount });
  const monthlyAmount =
    loan.savingsRateType === 'FIXED' && loan.savingsMonthlyAmount != null
      ? formatCurrency(loan.savingsMonthlyAmount, locale)
      : null;

  const requiredDeposits = loan.requiredDepositsCount;
  const paidDeposits = Math.max(0, Math.min(loan.depositsCount, requiredDeposits));
  const progressPercentage = requiredDeposits > 0 ? (paidDeposits / requiredDeposits) * 100 : 0;
  const installments = t('table.savingsInstallmentsPaid', { paid: loan.depositsCount, required: requiredDeposits });

  return (
    <InfoItem
      className={className}
      label={t('table.savingsContractSummaryLabel')}
      value={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            {rates && (
              <span>
                <span className="whitespace-nowrap">{rates}</span>
                {monthlyAmount && (
                  <>
                    {' '}
                    <span className="text-muted-foreground text-sm">{t('table.for')}</span>{' '}
                    <span className="whitespace-nowrap">{monthlyAmount}</span>
                  </>
                )}
              </span>
            )}
            <Badge className="ml-auto" variant={isOutstanding ? 'destructive' : 'secondary'}>
              {paymentStatus}
            </Badge>
          </div>
          {requiredDeposits > 0 && (
            <div className="space-y-1 text-sm font-normal">
              <div>{installments}</div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={requiredDeposits}
                aria-valuenow={paidDeposits}
                aria-valuetext={installments}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn('h-full rounded-full transition-all', isOutstanding ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {(firstDepositDate || lastDepositDate) && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="whitespace-nowrap">
                    {firstDepositDate ? formatDateShort(firstDepositDate, locale) : ''}
                  </span>
                  <span className="whitespace-nowrap">
                    {lastDepositDate ? formatDateShort(lastDepositDate, locale) : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}
