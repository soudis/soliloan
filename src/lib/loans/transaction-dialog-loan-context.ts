import { SavingsRateType } from '@prisma/client';

import { formatCurrency, formatDateShort } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

type LoanForTransactionContext = Pick<
  LoanDetailsWithCalculations,
  | 'loanNumber'
  | 'isSavingsContract'
  | 'savingsRateType'
  | 'savingsMonthlyAmount'
  | 'savingsDepositCount'
  | 'requiredDepositsCount'
  | 'outstandingDepositsCount'
  | 'outstandingDepositSum'
  | 'outstandingDepositSinceDate'
>;

type TranslateTransactions = (
  key:
    | 'createContextLoanLabel'
    | 'createContextSavingsGeneralFixed'
    | 'createContextSavingsGeneralVarying'
    | 'createContextSavingsOutstanding'
    | 'createContextRegularOutstanding'
    | 'createContextNotOutstanding',
  values?: Record<string, string | number>,
) => string;

export type TransactionDialogLoanContext = {
  loanLabel: string;
  generalInfo: string | null;
  detailInfo: string;
};

export function getTransactionDialogLoanContext(
  loan: LoanForTransactionContext,
  t: TranslateTransactions,
  locale: string,
): TransactionDialogLoanContext {
  const loanLabel = t('createContextLoanLabel', { loanNumber: loan.loanNumber });
  const isOutstanding = loan.outstandingDepositsCount > 0 && loan.outstandingDepositSinceDate != null;
  const date = isOutstanding ? formatDateShort(loan.outstandingDepositSinceDate, locale) : '';

  if (!isOutstanding) {
    return {
      loanLabel,
      generalInfo: null,
      detailInfo: t('createContextNotOutstanding'),
    };
  }

  if (loan.isSavingsContract) {
    const total = loan.requiredDepositsCount || loan.savingsDepositCount || 0;
    const current = Math.max(1, total - loan.outstandingDepositsCount + 1);
    const count = total;
    const detailInfo = t('createContextSavingsOutstanding', { current, total, date });

    if (loan.savingsRateType === SavingsRateType.FIXED && loan.savingsMonthlyAmount != null) {
      return {
        loanLabel,
        generalInfo: t('createContextSavingsGeneralFixed', {
          count,
          installmentAmount: formatCurrency(loan.savingsMonthlyAmount, locale),
        }),
        detailInfo,
      };
    }

    return {
      loanLabel,
      generalInfo: t('createContextSavingsGeneralVarying', { count }),
      detailInfo,
    };
  }

  return {
    loanLabel,
    generalInfo: null,
    detailInfo: t('createContextRegularOutstanding', {
      amount: formatCurrency(loan.outstandingDepositSum ?? 0, locale),
      date,
    }),
  };
}
