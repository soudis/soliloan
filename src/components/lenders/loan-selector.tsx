'use client';

import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';
import { useBreakpoint } from 'use-breakpoint';
import { LoanDropdown } from './loan-dropdown';
import { LoanTabs } from './loan-tabs';

// Tailwind breakpoints
const BREAKPOINTS = { mobile: 0, tablet: 768, desktop: 1280 };

interface LoanSelectorProps {
  loans: LoanWithCalculations[];
  lender: LenderWithCalculations;
  selectedLoanId?: string;
  onSelectLoan: (loanId: string | null) => void;
  maxTabs: number;
}

export function LoanSelector({ loans, selectedLoanId, onSelectLoan, maxTabs, lender }: LoanSelectorProps) {
  const { breakpoint } = useBreakpoint(BREAKPOINTS, 'mobile');
  const isMobile = breakpoint === 'mobile';

  const showTabs = loans.length <= maxTabs && !isMobile;

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
