'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoanSelectorItem } from './loan-selector-item';
import { LoanSelectorItemRow } from './loan-selector-item-row';

interface LoanDropdownProps {
  loans: LoanWithCalculations[];
  lender?: LenderWithCalculations;
  selectedLoanId?: string;
  onSelectLoan: (loanId: string | null) => void;
  simple?: boolean;
}

export function LoanDropdown({ loans, selectedLoanId, onSelectLoan, lender, simple = false }: LoanDropdownProps) {
  const selectedLoan = loans.find((loan) => loan.id === selectedLoanId);
  const tLoan = useTranslations('dashboard.loans');
  const tCommon = useTranslations('common');
  const router = useRouter();
  return (
    <div className="w-full flex flex-row gap-3 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex items-center justify-between w-full md:w-auto h-auto rounded-xl p-3 border border-border bg-card hover:bg-muted data-[state=open]:bg-muted data-[state=open]:border-primary cursor-pointer min-w-[200px] text-left',
              simple && 'rounded-md p-2 min-w-full',
            )}
          >
            {!simple &&
              (selectedLoan ? (
                <>
                  <LoanSelectorItem loan={selectedLoan} />
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
                  {tLoan('dropdown.selectFallback')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </span>
              ))}
            {simple &&
              (selectedLoan ? (
                <div className="flex items-center w-full justify-between">
                  <span className="text-sm font-medium">
                    {tCommon('terms.loan')} #{selectedLoan.loanNumber}
                  </span>
                  <div className="flex items-center">
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </div>
                </div>
              ) : (
                <span className="flex items-center w-full justify-between">
                  {tLoan('dropdown.selectFallback')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </span>
              ))}
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
                <LoanSelectorItemRow loan={loan} />
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {lender && (
        <div className="flex items-center ">
          <Button
            size="lg"
            variant="outline"
            className=" min-h-21 rounded-xl"
            onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}
          >
            <Plus />
            {tCommon('terms.loan')}
          </Button>
        </div>
      )}
    </div>
  );
}
