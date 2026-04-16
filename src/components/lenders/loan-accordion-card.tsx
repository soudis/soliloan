'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Pencil, ShieldX, Trash2, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteLoanAction, revertTerminateLoanAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { InfoItem } from '@/components/ui/info-item';
import { useRouter } from '@/i18n/navigation';
import { formatTerminationModalities } from '@/lib/table-column-utils';
import { cn, formatCurrency, formatDateLong, formatDateShort, formatPercentage } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { LoanStatus } from '@/types/loans';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { BalanceTable } from '../loans/balance-table';
import { LoanStatusBadge } from '../loans/loan-status-badge';
import { LoanTransactions } from '../loans/loan-transactions';
import { TerminationDialog } from '../loans/termination-dialog';
import { useProject } from '../providers/project-provider';
import { Button } from '../ui/button';

interface LoanAccordionCardProps {
  loan: LoanDetailsWithCalculations;
  defaultOpen?: boolean;
}

export function LoanAccordionCard({ loan, defaultOpen = false }: LoanAccordionCardProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { project } = useProject();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [isRevertTerminateOpen, setIsRevertTerminateOpen] = useState(false);
  const [loanId] = useQueryState('loanId', parseAsString);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDeepLinked = loanId === loan.id;
  const [isOpen, setIsOpen] = useState(defaultOpen || isDeepLinked);

  useEffect(() => {
    if (isDeepLinked) {
      setIsOpen(true);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isDeepLinked]);

  const canTerminateLoan =
    loan.terminationType === 'TERMINATION' && loan.status === LoanStatus.ACTIVE && !loan.isTerminated;

  const getTerminationModalities = () => formatTerminationModalities(loan, commonT, (d) => formatDateLong(d, locale));

  const handleDeleteLoan = async () => {
    const toastId = toast.loading(t('delete.loading'));
    try {
      const result = await deleteLoanAction({ loanId: loan.id });
      if (result?.serverError || result?.validationErrors) {
        toast.error(t(`errors.${result.serverError || 'Validation failed'}`), { id: toastId });
      } else {
        toast.success(t('delete.success'), { id: toastId });
        await queryClient.invalidateQueries({ queryKey: ['lender', loan.lender.id] });
      }
    } catch {
      toast.error(t('delete.error'), { id: toastId });
    }
  };

  const handleRevertTermination = async () => {
    const toastId = toast.loading(t('terminate.revertLoading'));
    try {
      const result = await revertTerminateLoanAction({ loanId: loan.id });
      if (result?.serverError || result?.validationErrors) {
        toast.error(t('terminate.revertError'), { id: toastId });
      } else {
        toast.success(t('terminate.revertSuccess'), { id: toastId });
        await queryClient.invalidateQueries({ queryKey: ['lender', loan.lender.id] });
      }
    } catch {
      toast.error(t('terminate.revertError'), { id: toastId });
    }
  };

  return (
    <div ref={cardRef} className="scroll-mt-24 rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Collapsible header */}
      <div className="flex w-full items-center p-4 gap-2">
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: needed */}
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex flex-row items-center justify-between text-left cursor-pointer w-full"
        >
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                {t('table.loanNumberShort')} #{loan.loanNumber}
              </span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>{formatCurrency(loan.amount)}</span>
              <span>·</span>
              <span>{formatPercentage(loan.interestRate)} %</span>
              <span>·</span>
              <span>{formatDateShort(loan.signDate, locale)}</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <LoanStatusBadge status={loan.status} />
          </div>
          <div className="flex gap-1 shrink-0 ml-auto items-center justify-end flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/loans/${loan.id}/edit`);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">{commonT('ui.actions.edit')}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmOpen(true);
              }}
              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">{commonT('ui.actions.delete')}</span>
            </Button>
            <ChevronDown
              className={cn(
                'ml-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </div>
        </div>
      </div>

      {/* Expandable content */}
      {isOpen && (
        <div className="border-t px-4 pb-4 pt-4">
          {/* Loan details + balance in two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <InfoItem label={t('table.signDate')} value={formatDateLong(loan.signDate, locale)} />
              <InfoItem
                label={t('table.amount')}
                value={
                  <span>
                    <span className="whitespace-nowrap">{formatCurrency(loan.amount)}</span>{' '}
                    <span className="text-muted-foreground text-sm">{t('table.for')}</span>{' '}
                    <span className="whitespace-nowrap">{formatPercentage(loan.interestRate)} %</span>
                  </span>
                }
              />
              <InfoItem label={t('table.terminationModalities')} value={getTerminationModalities()} />
              {canTerminateLoan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setIsTerminateOpen(true)}
                >
                  <ShieldX className="h-4 w-4 mr-1.5" />
                  {t('terminate.button')}
                </Button>
              )}
              {loan.terminationDate && loan.terminationType === 'TERMINATION' && (
                <div className="flex items-end gap-2">
                  <InfoItem label={t('table.terminationDate')} value={formatDateLong(loan.terminationDate, locale)} />
                  {loan.isTerminated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      onClick={() => setIsRevertTerminateOpen(true)}
                    >
                      <Undo2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      {t('terminate.revertButton')}
                    </Button>
                  )}
                </div>
              )}
              {loan.repayDate &&
                loan.status !== 'REPAID' &&
                loan.status !== 'NOTDEPOSITED' &&
                loan.terminationType !== 'ENDDATE' && (
                  <InfoItem label={t('table.repayDate')} value={formatDateLong(loan.repayDate, locale)} />
                )}
              {loan.status === 'REPAID' && loan.transactions.at(-1)?.date && (
                <InfoItem
                  label={t('table.repaidDate')}
                  value={formatDateLong(loan.transactions.at(-1)?.date, locale)}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <AdditionalFieldInfoItems
                  additionalFields={loan.additionalFields}
                  configuration={project.configuration.loanAdditionalFields}
                />
              </div>
            </div>
            <div>
              <BalanceTable className="lg:mt-0" totals={loan} />
            </div>
          </div>

          {/* Transactions */}
          <div className="mt-4 pt-4 border-t">
            <LoanTransactions loanId={loan.id} transactions={loan.transactions} loan={loan} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => handleDeleteLoan()}
        title={t('delete.confirmTitle')}
        description={t('delete.confirmDescription')}
        confirmText={commonT('ui.actions.delete')}
      />

      {loan.terminationType === 'TERMINATION' && (
        <TerminationDialog loan={loan} open={isTerminateOpen} onOpenChange={setIsTerminateOpen} />
      )}

      <ConfirmDialog
        open={isRevertTerminateOpen}
        onOpenChange={setIsRevertTerminateOpen}
        onConfirm={handleRevertTermination}
        title={t('terminate.revertConfirmTitle')}
        description={t('terminate.revertConfirmDescription')}
      />
    </div>
  );
}
