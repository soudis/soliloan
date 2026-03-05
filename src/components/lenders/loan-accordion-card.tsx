'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteLoanAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { InfoItem } from '@/components/ui/info-item';
import { useRouter } from '@/i18n/navigation';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { BalanceTable } from '../loans/balance-table';
import { LoanStatusBadge } from '../loans/loan-status-badge';
import { LoanTransactions } from '../loans/loan-transactions';
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
  const dateLocale = locale === 'de' ? de : enUS;
  const { project } = useProject();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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

  const getTerminationModalities = () => {
    switch (loan.terminationType) {
      case 'ENDDATE':
        return `${commonT('enums.loan.terminationType.ENDDATE')} - ${loan.endDate ? format(new Date(loan.endDate), 'PPP', { locale: dateLocale }) : '-'}`;
      case 'TERMINATION':
        if (!loan.terminationPeriod || !loan.terminationPeriodType)
          return `${commonT('enums.loan.terminationType.TERMINATION')} - -`;
        return `${commonT('enums.loan.terminationType.TERMINATION')} - ${loan.terminationPeriod} ${
          loan.terminationPeriodType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
        }`;
      case 'DURATION':
        if (!loan.duration || !loan.durationType) return `${commonT('enums.loan.terminationType.DURATION')} - -`;
        return `${commonT('enums.loan.terminationType.DURATION')} - ${loan.duration} ${
          loan.durationType === 'MONTHS'
            ? commonT('enums.loan.durationUnit.MONTHS')
            : commonT('enums.loan.durationUnit.YEARS')
        }`;
      default:
        return '-';
    }
  };

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

  return (
    <div ref={cardRef} className="scroll-mt-24 rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Collapsible header */}
      <div className="flex w-full items-center p-4 gap-2">
        {/** biome-ignore lint/a11y/noStaticElementInteractions: needed */}
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
              <span>{format(new Date(loan.signDate), 'PP', { locale: dateLocale })}</span>
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
              <InfoItem
                label={t('table.signDate')}
                value={format(new Date(loan.signDate), 'PPP', { locale: dateLocale })}
              />
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
              {loan.terminationDate && loan.terminationType === 'TERMINATION' && (
                <InfoItem
                  label={t('table.terminationDate')}
                  value={format(new Date(loan.terminationDate), 'PPP', { locale: dateLocale })}
                />
              )}
              {loan.repayDate &&
                loan.status !== 'REPAID' &&
                loan.status !== 'NOTDEPOSITED' &&
                loan.terminationType !== 'ENDDATE' && (
                  <InfoItem
                    label={t('table.repayDate')}
                    value={format(new Date(loan.repayDate), 'PPP', { locale: dateLocale })}
                  />
                )}
              {loan.status === 'REPAID' && loan.transactions.at(-1)?.date && (
                <InfoItem
                  label={t('table.repaidDate')}
                  value={format(new Date(loan.transactions.at(-1)?.date ?? ''), 'PPP', { locale: dateLocale })}
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
    </div>
  );
}
