'use client';

import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';
import { LoanDropdown } from './loan-dropdown';
import { LoanTabs } from './loan-tabs';

interface LoanSelectorProps {
  loans: LoanWithCalculations[];
  lender: LenderWithCalculations;
  selectedLoanId?: string;
  onSelectLoan: (loanId: string | null) => void;
  maxTabs: number;
}

export function LoanSelector({ loans, selectedLoanId, onSelectLoan, maxTabs, lender }: LoanSelectorProps) {
  const showTabs = loans.length <= maxTabs;

  return (
    <>
      {showTabs ? (
        <LoanTabs lender={lender} loans={loans} selectedLoanId={selectedLoanId} onSelectLoan={onSelectLoan} />
      ) : (
        <LoanDropdown lender={lender} loans={loans} selectedLoanId={selectedLoanId} onSelectLoan={onSelectLoan} />
      )}
    </>
  );
}
