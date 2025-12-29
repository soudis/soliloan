import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useLenderLoanSelectionStore } from '@/store/lender-loan-selection-store';
import type { LenderWithCalculations } from '@/types/lenders';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LoanCard } from '../loans/loan-card';
import { Button } from '../ui/button';
import { LoanDropdown } from './loan-dropdown';

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

  const router = useRouter();

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="lg:flex-1 min-w-0">
          <LoanDropdown
            loans={lender.loans}
            selectedLoanId={selectedLoanId}
            onSelectLoan={(loanId) => setSelectedLoanId(lender.id, loanId ?? undefined)}
            lender={lender}
          />
        </div>
        <Button
          variant="outline"
          className={cn(
            'border-dashed rounded-xl flex items-center justify-center transition-all cursor-pointer',
            lender.loans.length === 0
              ? 'w-full py-12 flex-col gap-2'
              : 'w-full lg:w-auto lg:flex-1 h-12 lg:h-auto flex-row gap-2 lg:self-stretch lg:min-h-0',
          )}
          onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}
        >
          <Plus className={cn(lender.loans.length === 0 ? 'h-10 w-10' : 'h-5 w-5')} />
          <span className="font-medium text-sm">{tCommon('terms.loan')}</span>
        </Button>
      </div>

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
