'use client';

import { memo, useMemo } from 'react';

import { LoanDropdown } from '@/components/lenders/loan-dropdown';
import type { LoanWithCalculations } from '@/types/loans';

const EMPTY_LOANS: LoanWithCalculations[] = [];

type Props = {
  rowId: string;
  selectedLoanId: string | null;
  lenderLoans: LoanWithCalculations[];
  loanById: Map<string, LoanWithCalculations>;
  onSelectLoan: (rowId: string, loanId: string | null) => void;
};

function BankImportLoanCellInner({ rowId, selectedLoanId, lenderLoans, loanById, onSelectLoan }: Props) {
  const dropdownLoans = useMemo(() => {
    if (!selectedLoanId || lenderLoans.some((loan) => loan.id === selectedLoanId)) {
      return lenderLoans;
    }
    const selected = loanById.get(selectedLoanId);
    return selected ? [...lenderLoans, selected] : lenderLoans;
  }, [lenderLoans, loanById, selectedLoanId]);

  return (
    <div className="min-w-[160px]">
      <LoanDropdown
        key={rowId}
        disabled={lenderLoans.length === 0}
        loans={dropdownLoans}
        loanLookup={loanById}
        selectedLoanId={selectedLoanId ?? undefined}
        onSelectLoan={(loanId) => onSelectLoan(rowId, loanId)}
        simple
      />
    </div>
  );
}

export const BankImportLoanCell = memo(BankImportLoanCellInner);

export { EMPTY_LOANS };
