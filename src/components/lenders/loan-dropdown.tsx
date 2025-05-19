'use client';

import type { getLenderById } from '@/app/actions/lenders';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { LoanSelectorItem } from './loan-selector-item';
import { LoanSelectorItemRow } from './loan-selector-item-row';

type LoanInSelector = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0];

interface LoanDropdownProps {
  loans: LoanInSelector[];
  selectedLoanId?: string;
  onSelectLoan: (loanId: string) => void;
  commonT: ReturnType<typeof useTranslations<string>>;
  loanT: ReturnType<typeof useTranslations<string>>;
}

export function LoanDropdown({ loans, selectedLoanId, onSelectLoan, commonT, loanT }: LoanDropdownProps) {
  const selectedLoan = loans.find((loan) => loan.id === selectedLoanId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-between w-full md:w-auto h-auto rounded-xl p-3 mb-4 border border-border bg-card hover:bg-muted data-[state=open]:bg-muted data-[state=open]:border-primary cursor-pointer min-w-[200px] text-left"
        >
          {selectedLoan ? (
            <>
              <LoanSelectorItem loan={selectedLoan} commonT={commonT} loanT={loanT} />
              <div className="ml-2 flex items-center self-stretch">
                <div className="h-full border-l border-border mx-2" />
                <ChevronDown className="ml-1 h-3 w-3 flex-shrink-0 opacity-75" />
                {loans.length > 0 && (
                  <span className="flex items-center justify-center text-xs font-normal bg-muted text-muted-foreground rounded-xl px-1 py-0.5 mb-4">
                    {loans.length}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="flex items-center">
              {loanT('dropdown.selectFallback')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] table p-0">
        {loans.map((loan) => {
          return (
            <DropdownMenuItem
              key={loan.id}
              onSelect={() => onSelectLoan(loan.id)}
              className="table-row cursor-pointer rounded-md data-[highlighted]:bg-muted data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold"
            >
              <LoanSelectorItemRow loan={loan} commonT={commonT} loanT={loanT} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
