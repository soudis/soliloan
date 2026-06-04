'use client';

import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';

import { cn } from '@/lib/utils';

interface LoanReferenceLinkProps {
  loanId: string;
  loanNumber?: number | null;
  className?: string;
}

export function LoanReferenceLink({ loanId, loanNumber, className }: LoanReferenceLinkProps) {
  const commonT = useTranslations('common');
  const [, setLoanId] = useQueryState('loanId', parseAsString);

  return (
    <button
      type="button"
      onClick={() => setLoanId(loanId)}
      className={cn(
        'flex items-center text-xs text-muted-foreground font-bold hover:text-foreground hover:underline cursor-pointer',
        className,
      )}
    >
      <Wallet className="h-3 w-3 mr-1 shrink-0" />
      {commonT('terms.loan')} #{loanNumber}
    </button>
  );
}
