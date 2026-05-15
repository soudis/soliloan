'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type LoanDetailsWithCalculations, LoanStatus } from '@/types/loans';
import { TransactionDialog } from './transaction-dialog';

export type LoanAddTransactionControlProps = {
  loanId: string;
  loan: LoanDetailsWithCalculations;
  className?: string;
};

export function LoanAddTransactionControl({ loanId, loan, className }: LoanAddTransactionControlProps) {
  const commonT = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className={className ?? 'w-full border-dashed py-6'}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loan.status === LoanStatus.REPAID}
      >
        <Plus className="mr-2 h-4 w-4" />
        {commonT('terms.transaction')}
      </Button>
      <TransactionDialog loanId={loanId} open={open} onOpenChange={setOpen} />
    </>
  );
}
