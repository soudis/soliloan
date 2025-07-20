import { useRouter } from '@/i18n/navigation';
import { useLenderLoanSelectionStore } from '@/store/lender-loan-selection-store';
import type { LenderWithCalculations } from '@/types/lenders';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LoanCard } from '../loans/loan-card';
import { LoanSelector } from './loan-selector';

type Props = {
  lender: LenderWithCalculations;
};

export const LenderLoansTab = ({ lender }: Props) => {
  const { getSelectedLoanId, setSelectedLoanId } = useLenderLoanSelectionStore();
  const selectedLoanId = getSelectedLoanId(lender.id) ?? lender.loans[0]?.id;
  const tCommon = useTranslations('common');
  const selectedLoan = useMemo(() => {
    return lender.loans.find((loan) => loan.id === selectedLoanId);
  }, [lender.loans, selectedLoanId]);

  // State for responsive max tabs
  const [maxTabs, setMaxTabs] = useState(4);

  // Effect to update maxTabs based on screen size
  useEffect(() => {
    const checkSize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setMaxTabs(4); // lg and up
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setMaxTabs(3); // md and up
      } else {
        setMaxTabs(2); // sm and down
      }
    };

    checkSize(); // Initial check on mount
    window.addEventListener('resize', checkSize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', checkSize);
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return (
    <div className="w-full flex flex-col gap-6">
      <LoanSelector
        loans={lender.loans}
        selectedLoanId={selectedLoanId}
        onSelectLoan={(loanId) => setSelectedLoanId(lender.id, loanId ?? undefined)}
        maxTabs={maxTabs}
        lender={lender}
      />
      {lender.loans.length === 0 && (
        <div className="text-center text-muted-foreground py-8">{tCommon('terms.noLoans')}</div>
      )}
      <AnimatePresence mode="wait">
        {selectedLoan && (
          <motion.div key={selectedLoan.id}>
            <LoanCard loan={selectedLoan} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
