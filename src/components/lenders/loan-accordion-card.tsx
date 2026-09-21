'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, NotebookPen, Paperclip, Pencil, RotateCcw, ShieldX, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteLoanAction, revertTerminateLoanAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { FileDialog } from '@/components/generic/file-dialog';
import { NoteDialog } from '@/components/generic/note-dialog';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { InfoItem } from '@/components/ui/info-item';
import { useRouter } from '@/i18n/navigation';
import { formatTerminationModalities } from '@/lib/table-column-utils';
import { cn, formatCurrency, formatDateLong, formatDateShort, formatPercentage } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';
import { LoanStatus } from '@/types/loans';
import { AdditionalFieldInfoItems } from '../dashboard/additional-field-info-items';
import { LoanBalanceSummary } from '../loans/loan-balance-summary';
import { LoanStatusBadge } from '../loans/loan-status-badge';
import { LoanTransactions } from '../loans/loan-transactions';
import { SavingsContractInfoItem } from '../loans/savings-contract-info-item';
import { TerminationDialog } from '../loans/termination-dialog';
import { TransactionDialog } from '../loans/transaction-dialog';
import { useProject } from '../providers/project-provider';
import { ActionButton } from '../ui/action-button';
import { Button } from '../ui/button';
import { AddEntityMenu } from './add-entity-menu';
import { LoanNotesFilesSection } from './loan-notes-files-section';

interface LoanAccordionCardProps {
  loan: LoanDetailsWithCalculations;
  defaultOpen?: boolean;
}

export function LoanAccordionCard({ loan, defaultOpen = false }: LoanAccordionCardProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const notesT = useTranslations('dashboard.notes');
  const filesT = useTranslations('dashboard.files');
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
  const [scrollTarget, setScrollTarget] = useState<'notes-files' | 'transactions' | null>(null);
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [fileCreateOpen, setFileCreateOpen] = useState(false);
  const [transactionCreateOpen, setTransactionCreateOpen] = useState(false);
  const expandAfterCreateRef = useRef<'notes-files' | 'transactions' | null>(null);

  const contentId = `loan-accordion-${loan.id}`;
  const triggerId = `loan-accordion-trigger-${loan.id}`;
  const notesFilesId = `loan-notes-files-${loan.id}`;
  const transactionsId = `loan-transactions-${loan.id}`;

  useEffect(() => {
    if (isDeepLinked) {
      setIsOpen(true);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isDeepLinked]);

  useEffect(() => {
    if (!isOpen || !scrollTarget) return;
    const id = scrollTarget === 'transactions' ? transactionsId : notesFilesId;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setScrollTarget(null);
  }, [isOpen, scrollTarget, notesFilesId, transactionsId]);

  const canTerminateLoan =
    loan.terminationType === 'TERMINATION' && loan.status === LoanStatus.ACTIVE && !loan.isTerminated;
  const canRevertTermination = loan.terminationType === 'TERMINATION' && loan.isTerminated;

  const getTerminationModalities = () => formatTerminationModalities(loan, commonT, (d) => formatDateShort(d, locale));

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

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const openCreateFromMenu = (target: 'notes-files' | 'transactions', open: () => void) => {
    expandAfterCreateRef.current = target;
    open();
  };

  const handleCreated = () => {
    const target = expandAfterCreateRef.current;
    expandAfterCreateRef.current = null;
    if (!target) return;
    setIsOpen(true);
    setScrollTarget(target);
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
    <div
      ref={cardRef}
      className="scroll-mt-24 rounded-lg border border-border bg-card text-card-foreground shadow-none"
    >
      <div className="flex items-center gap-2 p-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            id={triggerId}
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={toggleOpen}
            className="flex w-full cursor-pointer items-center gap-2 text-left"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {t('table.loanNumberShort')} #{loan.loanNumber}
                </span>
                <LoanStatusBadge status={loan.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{formatCurrency(loan.amount)}</span>
                <span>·</span>
                <span>{formatPercentage(loan.interestRate)}</span>
                <span>·</span>
                <span>{formatDateShort(loan.signDate, locale)}</span>
                {loan.notes.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <NotebookPen className="h-3 w-3" aria-hidden />
                      <span className="sr-only">{t('table.notes')}</span>
                      {loan.notes.length}
                    </span>
                  </>
                )}
                {loan.files.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" aria-hidden />
                      <span className="sr-only">{t('table.files')}</span>
                      {loan.files.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AddEntityMenu
            density="toolbar"
            items={[
              {
                id: 'transaction',
                label: commonT('terms.transaction'),
                onSelect: () => openCreateFromMenu('transactions', () => setTransactionCreateOpen(true)),
                disabled: loan.status === LoanStatus.REPAID,
                disabledTooltip: loan.status === LoanStatus.REPAID ? t('transactions.addDisabledRepaid') : undefined,
              },
              {
                id: 'note',
                label: notesT('text'),
                onSelect: () => openCreateFromMenu('notes-files', () => setNoteCreateOpen(true)),
              },
              {
                id: 'file',
                label: filesT('file'),
                onSelect: () => openCreateFromMenu('notes-files', () => setFileCreateOpen(true)),
              },
            ]}
          />
          <TemplateQuickActions
            projectId={loan.lender.projectId}
            mode="loan"
            lenderId={loan.lender.id}
            loanId={loan.id}
            density="toolbar"
          />
          <ActionButton
            intent="edit"
            density="icon"
            icon={<Pencil className="h-3.5 w-3.5" />}
            tooltip={commonT('ui.actions.edit')}
            srOnly={commonT('ui.actions.edit')}
            onClick={() => router.push(`/loans/${loan.id}/edit`)}
          />
          <ActionButton
            intent="delete"
            density="icon"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            tooltip={commonT('ui.actions.delete')}
            srOnly={commonT('ui.actions.delete')}
            onClick={() => setIsConfirmOpen(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-expanded={isOpen}
            aria-controls={contentId}
            aria-label={isOpen ? t('accordion.collapse') : t('accordion.expand')}
            onClick={toggleOpen}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <section id={contentId} aria-labelledby={triggerId}>
          <div className="border-t px-4 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <InfoItem label={t('table.signDate')} value={formatDateLong(loan.signDate, locale)} />
                <InfoItem
                  label={t('table.amount')}
                  value={
                    <span>
                      <span className="whitespace-nowrap">{formatCurrency(loan.amount)}</span>{' '}
                      <span className="text-muted-foreground text-sm">{t('table.for')}</span>{' '}
                      <span className="whitespace-nowrap">{formatPercentage(loan.interestRate)}</span>
                    </span>
                  }
                />
                <InfoItem
                  label={t('table.interestPaymentType')}
                  value={commonT(`enums.loan.interestPaymentType.${loan.interestPaymentType}`)}
                />
                {loan.isSavingsContract && <SavingsContractInfoItem loan={loan} />}
              </div>
              <div className="space-y-3">
                <InfoItem label={t('table.terminationModalities')} value={getTerminationModalities()} />
                {canTerminateLoan && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setIsTerminateOpen(true)}
                  >
                    <ShieldX />
                    {t('terminate.button')}
                  </Button>
                )}
                {canRevertTermination && (
                  <Button variant="outline" size="xs" onClick={() => setIsRevertTerminateOpen(true)}>
                    <RotateCcw />
                    {t('terminate.revertButton')}
                  </Button>
                )}
                {loan.terminationDate && loan.terminationType === 'TERMINATION' && (
                  <InfoItem label={t('table.terminationDate')} value={formatDateLong(loan.terminationDate, locale)} />
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
                    value={formatDateLong(loan.transactions.at(-1)?.date ?? '', locale)}
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <AdditionalFieldInfoItems
                    additionalFields={loan.additionalFields}
                    configuration={project.configuration.loanAdditionalFields}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t pb-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 xl:items-stretch">
              <div className="space-y-1 px-4 py-4">
                <LoanTransactions
                  loanId={loan.id}
                  transactions={loan.transactions}
                  loan={loan}
                  showBalanceSummary={false}
                  defaultShowBookings={false}
                  onAddTransaction={() => setTransactionCreateOpen(true)}
                />
              </div>
              <div className="flex min-h-0 flex-col border-t border-border xl:border-t-0 xl:border-l xl:border-border">
                <div className="flex flex-1 flex-col space-y-3 px-4 pb-4 pt-4 xl:py-4 xl:pl-6 xl:pr-4">
                  <LoanBalanceSummary loan={loan} readOnly={false} />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t px-4 py-4">
            <LoanNotesFilesSection
              loan={loan}
              onAddNote={() => setNoteCreateOpen(true)}
              onAddFile={() => setFileCreateOpen(true)}
            />
          </div>
        </section>
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

      <TransactionDialog
        loanId={loan.id}
        loan={loan}
        open={transactionCreateOpen}
        onOpenChange={(open) => {
          setTransactionCreateOpen(open);
          if (!open) expandAfterCreateRef.current = null;
        }}
        onCreated={handleCreated}
      />
      <NoteDialog
        lenderId={loan.lender.id}
        loanId={loan.id}
        open={noteCreateOpen}
        onOpenChange={(open) => {
          setNoteCreateOpen(open);
          if (!open) expandAfterCreateRef.current = null;
        }}
        onCreated={handleCreated}
      />
      <FileDialog
        lenderId={loan.lender.id}
        loanId={loan.id}
        open={fileCreateOpen}
        onOpenChange={(open) => {
          setFileCreateOpen(open);
          if (!open) expandAfterCreateRef.current = null;
        }}
        onCreated={handleCreated}
      />
    </div>
  );
}
