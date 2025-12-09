'use client';

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Files as FilesIcon, NotebookPen, Pencil, Receipt, Trash2, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InfoItem } from '@/components/ui/info-item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { useLoanTabsStore } from '@/store/loan-tabs-store';
import type { LoanWithCalculations } from '@/types/loans';

import { deleteLoanAction } from '@/actions/loans';
import { useRouter } from '@/i18n/navigation';
import { useLenderLoanSelectionStore } from '@/store/lender-loan-selection-store';
import { useProjects } from '@/store/projects-store';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { Files } from '../generic/files';
import { Notes } from '../generic/notes';
import { SectionCard } from '../generic/section-card';
import { Button } from '../ui/button';
import { BalanceTable } from './balance-table';
import { LoanContractStatusBadge } from './loan-contract-status-badge';
import { LoanStatusBadge } from './loan-status-badge';
import { LoanTransactions } from './loan-transactions';

interface LoanCardProps {
  loan: LoanWithCalculations;
  className?: string;
}

export function LoanCard({ loan, className }: LoanCardProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const { selectedProject } = useProjects();
  const { getActiveTab, setActiveTab } = useLoanTabsStore();
  const activeTab = getActiveTab(loan.id);
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { setSelectedLoanId } = useLenderLoanSelectionStore();
  const queryClient = useQueryClient();
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

  const handleDeleteClick = () => {
    setIsConfirmOpen(true);
  };

  const handleDeleteLoan = async () => {
    const toastId = toast.loading(t('delete.loading'));

    try {
      const result = await deleteLoanAction({ loanId: loan.id });

      if (result?.serverError || result?.validationErrors) {
        toast.error(t(`errors.${result.serverError || 'Validation failed'}`), {
          id: toastId,
        });
      } else {
        toast.success(t('delete.success'), {
          id: toastId,
        });
        await queryClient.invalidateQueries({
          queryKey: ['lender', loan.lender.id],
        });
        // Adjust selection after deletion
        const remainingLoans = loan.lender.loans?.filter((l) => l.id !== loan.id) || [];
        const newSelectedLoanId = remainingLoans.length > 0 ? remainingLoans[0].id : '';
        setSelectedLoanId(loan.lender.id, newSelectedLoanId);
      }
    } catch (e) {
      toast.error(t('delete.error'), {
        id: toastId,
      });
      console.error('Failed to delete loan:', e);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => router.push(`/loans/${loan.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          {commonT('ui.actions.edit')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          className="text-destructive hover:text-destructive/90 border-destructive/50 hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {commonT('ui.actions.delete')}
        </Button>
      </div>

      <SectionCard
        className={className}
        icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        title={
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {t('table.loanNumberShort')} #{loan.loanNumber}
              </h3>
              <div className="flex gap-2">
                <LoanContractStatusBadge loan={loan} />
                <LoanStatusBadge status={loan.status} />
              </div>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label={t('table.signDate')}
                value={format(new Date(loan.signDate), 'PPP', {
                  locale: dateLocale,
                })}
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdditionalFieldInfoItems
                additionalFields={loan.additionalFields}
                configuration={selectedProject?.configuration.loanAdditionalFields}
              />
            </div>
          </div>
          <div>
            <BalanceTable className="mt-4 lg:mt-0" totals={loan} />
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(loan.id, value as 'transactions' | 'files' | 'notes' | 'bookings')}
          className="mt-6"
        >
          <TabsList className="w-full h-auto p-1 bg-muted rounded-xl md:mt-4 flex md:justify-start gap-1">
            <TabsTrigger
              value="transactions"
              className="flex-1 md:flex-none flex flex-col md:flex-row gap-1 md:gap-2 items-center justify-center py-2 md:px-4 rounded-lg text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all hover:text-foreground"
            >
              <ArrowRightLeft className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-sm font-medium">{t('table.transactions')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="flex-1 md:flex-none flex flex-col md:flex-row gap-1 md:gap-2 items-center justify-center py-2 md:px-4 rounded-lg text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all hover:text-foreground"
            >
              <Receipt className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-sm font-medium">{t('table.bookings')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="flex-1 md:flex-none flex flex-col md:flex-row gap-1 md:gap-2 items-center justify-center py-2 md:px-4 rounded-lg text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all hover:text-foreground relative"
            >
              <div className="relative">
                <FilesIcon className="h-5 w-5 md:h-4 md:w-4" />
                {loan.files && loan.files.length > 0 && (
                  <span className="absolute -top-2 -right-3 md:hidden flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] border border-background">
                    {loan.files.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] md:text-sm font-medium">{t('table.files')}</span>
              {loan.files && loan.files.length > 0 && (
                <Badge variant="secondary" className="ml-2 hidden md:inline-flex h-5 px-1.5">
                  {loan.files.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="flex-1 md:flex-none flex flex-col md:flex-row gap-1 md:gap-2 items-center justify-center py-2 md:px-4 rounded-lg text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all hover:text-foreground relative"
            >
              <div className="relative">
                <NotebookPen className="h-5 w-5 md:h-4 md:w-4" />
                {loan.notes && loan.notes.length > 0 && (
                  <span className="absolute -top-2 -right-3 md:hidden flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] border border-background">
                    {loan.notes.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] md:text-sm font-medium">{t('table.notes')}</span>
              {loan.notes && loan.notes.length > 0 && (
                <Badge variant="secondary" className="ml-2 hidden md:inline-flex h-5 px-1.5">
                  {loan.notes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <LoanTransactions
              loanId={loan.id}
              transactions={loan.transactions.filter((t) => t.type !== 'INTEREST')}
              loan={loan}
            />
          </TabsContent>
          <TabsContent value="bookings">
            <LoanTransactions loanId={loan.id} transactions={loan.transactions} loan={loan} />
          </TabsContent>
          <TabsContent value="files">
            <Files lenderId={loan.lender.id} loanId={loan.id} files={loan.files} />
          </TabsContent>
          <TabsContent value="notes">
            <Notes notes={loan.notes} loanId={loan.id} lenderId={loan.lender.id} />
          </TabsContent>
        </Tabs>
      </SectionCard>

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
