'use client';

import type { getLenderById } from '@/app/actions/lenders';
import type { useTranslations } from 'next-intl';
import { LoanDropdown } from './loan-dropdown';
import { LoanTabs } from './loan-tabs';

// Define LoanBadges locally or import if it's made a shared component
// Removed LoanBadges as it's now in LoanDisplayItem.tsx

type LoanInSelector = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0];

interface LoanSelectorProps {
  loans: LoanInSelector[];
  selectedLoanId?: string;
  onSelectLoan: (loanId: string) => void;
  maxTabs: number;
  commonT: ReturnType<typeof useTranslations<string>>;
  loanT: ReturnType<typeof useTranslations<string>>;
}

export function LoanSelector({ loans, selectedLoanId, onSelectLoan, maxTabs, commonT, loanT }: LoanSelectorProps) {
  const showTabs = loans.length <= maxTabs;

  if (loans.length === 0) {
    return null; // Or some placeholder if needed, parent handles "noLoans" message
  }

  return (
    <>
      {showTabs ? (
        <LoanTabs
          loans={loans}
          selectedLoanId={selectedLoanId}
          onSelectLoan={onSelectLoan}
          commonT={commonT}
          loanT={loanT}
        />
      ) : (
        <LoanDropdown
          loans={loans}
          selectedLoanId={selectedLoanId}
          onSelectLoan={onSelectLoan}
          commonT={commonT}
          loanT={loanT}
        />
      )}
    </>
  );
}
