'use client';

import { TransactionType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { createYearlyInterestPayoutsAction } from '@/actions/processes/mutations/create-yearly-interest-payouts';
import { PaymentDetails } from '@/components/processes/payment-details';
import { SepaSkippedTable } from '@/components/processes/sepa-skipped-table';
import { StepProgress } from '@/components/processes/step-progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { downloadXml } from '@/lib/processes/download-xml';
import {
  type CreditorGap,
  type DebtorGap,
  groupPayoutRows,
  type PayoutGrouping,
  type PayoutRow,
  payoutPurpose,
} from '@/lib/processes/payout-groups';
import type { YearlyInterestLoanView } from '@/lib/processes/yearly-interest-view';
import { toUTCDate } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  year: number;
  loans: YearlyInterestLoanView[];
  sepaGaps: DebtorGap[];
};

type SkippedLender = {
  loanId: string;
  loanNumber: number;
  lenderName: string;
  reasons?: string[];
  missing?: string[];
};

function skippedReasons(entry: { reasons?: string[]; missing?: string[] }) {
  return entry.reasons ?? entry.missing ?? [];
}

function loansToRows(loans: YearlyInterestLoanView[], year: number): PayoutRow[] {
  return loans.map((loan) => ({
    id: loan.id,
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    lenderId: loan.lender.id,
    lenderName: loan.lender.name,
    iban: loan.lender.iban,
    bic: loan.lender.bic,
    type: TransactionType.INTERESTPAYMENT,
    amount: loan.unpaid,
    year,
  }));
}

export function YearlyInterestWizard({ open, onOpenChange, projectId, year, loans, sepaGaps }: Props) {
  const t = useTranslations('processes');
  const queryClient = useQueryClient();
  const [grouping, setGrouping] = useState<PayoutGrouping | null>(null);
  const [emailLenders, setEmailLenders] = useState(false);
  const [executionDate, setExecutionDate] = useState<Date | null>(new Date(year, 11, 31));
  const [phase, setPhase] = useState<'start' | 'steps' | 'skipped'>('start');
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedByStep, setSelectedByStep] = useState<Record<string, string[]>>({});
  const [emailByStep, setEmailByStep] = useState<Record<string, boolean>>({});
  const [skipped, setSkipped] = useState<SkippedLender[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = grouping ? groupPayoutRows(loansToRows(loans, year), grouping, false) : [];
  const step = steps[stepIndex];
  const lender = step ? loans.find((loan) => loan.lender.id === step.lenderId)?.lender : undefined;

  const reset = () => {
    setGrouping(null);
    setEmailLenders(false);
    setExecutionDate(new Date(year, 11, 31));
    setPhase('start');
    setStepIndex(0);
    setSelectedByStep({});
    setEmailByStep({});
    setSkipped([]);
    setIsSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['yearly-interest', projectId] });
  };

  const reportCreated = (createdCount: number, emailsSent: number, emailsFailed: number) => {
    if (createdCount > 0) {
      toast.success(t('yearlyInterest.created', { count: createdCount }));
    } else {
      toast.message(t('yearlyInterest.nothingCreated'));
    }
    if (emailsSent > 0) toast.success(t('yearlyInterest.emailsSent', { count: emailsSent }));
    if (emailsFailed > 0) toast.error(t('yearlyInterest.emailsFailed', { count: emailsFailed }));
    refresh();
  };

  const runSepa = async () => {
    if (!grouping || !executionDate) return;
    const utcDate = toUTCDate(executionDate);
    if (!utcDate) return;
    setIsSubmitting(true);
    const result = await createYearlyInterestPayoutsAction({
      projectId,
      year,
      loans: loans.map((loan) => ({ loanId: loan.id, notify: emailLenders })),
      sepa: { grouping, executionDate: utcDate },
    });
    setIsSubmitting(false);
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('sepa.noFile'));
      return;
    }
    reportCreated(result.data.createdCount, result.data.emailsSent, result.data.emailsFailed);
    if (result.data.xml) {
      downloadXml(`zinsen-${year}.xml`, result.data.xml);
    } else if (result.data.createdCount > 0) {
      toast.error(t('sepa.noFile'));
    }
    if (result.data.skipped.length > 0) {
      setSkipped(result.data.skipped);
      setPhase('skipped');
      return;
    }
    handleOpenChange(false);
  };

  const selectedIds = step ? (selectedByStep[step.key] ?? step.rows.map((row) => row.loanId)) : [];
  const emailThisStep = step ? (emailByStep[step.key] ?? emailLenders) : emailLenders;
  const selectedRows = step?.rows.filter((row) => selectedIds.includes(row.loanId)) ?? [];

  const acknowledge = async () => {
    if (!step || selectedRows.length === 0) return;
    setIsSubmitting(true);
    const result = await createYearlyInterestPayoutsAction({
      projectId,
      year,
      loans: selectedRows.map((row) => ({ loanId: row.loanId, notify: emailThisStep })),
      sepa: null,
    });
    setIsSubmitting(false);
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('yearlyInterest.nothingCreated'));
      return;
    }
    reportCreated(result.data.createdCount, result.data.emailsSent, result.data.emailsFailed);
    if (stepIndex >= steps.length - 1) {
      handleOpenChange(false);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const gapLabel = (gap: DebtorGap | CreditorGap) => t(`sepa.gaps.${gap}`);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        {...(phase === 'steps' ? { 'aria-describedby': undefined } : {})}
      >
        <DialogHeader>
          <DialogTitle>{t('wizard.title')}</DialogTitle>
          {phase !== 'steps' ? (
            <DialogDescription>
              {phase === 'skipped' ? t('sepa.skippedDescription') : t('wizard.intro')}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {phase === 'start' ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t('grouping.label')}</div>
              <RadioGroup value={grouping ?? ''} onValueChange={(value) => setGrouping(value as PayoutGrouping)}>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="lender" />
                  {t('grouping.lender')}
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="transaction" />
                  {t('grouping.transaction')}
                </Label>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">{t('grouping.hint')}</p>
            </div>

            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={emailLenders} onCheckedChange={(checked) => setEmailLenders(checked === true)} />
              {t('wizard.emailLenders')}
            </Label>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <div className="font-medium">{t('sepa.title')}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t('sepa.option')}</p>
              </div>
              {sepaGaps.length > 0 ? (
                <p className="text-sm text-destructive">
                  {t('sepa.disabled', { fields: sepaGaps.map((gap) => gapLabel(gap)).join(', ') })}
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm">{t('sepa.executionDate')}</div>
                  <DatePickerInput value={executionDate} onChange={setExecutionDate} />
                </div>
              )}
              <Button
                type="button"
                disabled={!grouping || sepaGaps.length > 0 || !executionDate || isSubmitting}
                onClick={() => void runSepa()}
              >
                {t('sepa.download')}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <div className="font-medium">{t('wizard.manual')}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t('wizard.manualDescription')}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!grouping}
                onClick={() => {
                  setPhase('steps');
                  setStepIndex(0);
                }}
              >
                {t('wizard.manual')}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === 'steps' && step && lender ? (
          <div className="space-y-4">
            <StepProgress current={stepIndex + 1} total={steps.length} name={step.lenderName} />
            <PaymentDetails
              lender={lender}
              lines={step.rows.map((row) => ({ id: row.loanId, loanNumber: row.loanNumber, amount: row.amount }))}
              purpose={payoutPurpose(selectedRows.length > 0 ? selectedRows : step.rows)}
              selectable={grouping === 'lender' && step.rows.length > 1}
              selectedIds={selectedIds}
              onSelectedIdsChange={(ids) => setSelectedByStep((current) => ({ ...current, [step.key]: ids }))}
            />
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={emailThisStep}
                onCheckedChange={(checked) =>
                  setEmailByStep((current) => ({ ...current, [step.key]: checked === true }))
                }
              />
              {t('wizard.emailThisStep')}
            </Label>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => current - 1)}
              >
                {t('wizard.back')}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (stepIndex >= steps.length - 1) {
                      handleOpenChange(false);
                      return;
                    }
                    setStepIndex((current) => current + 1);
                  }}
                >
                  {t('wizard.skip')}
                </Button>
                <Button
                  type="button"
                  disabled={selectedRows.length === 0 || isSubmitting}
                  onClick={() => void acknowledge()}
                >
                  {t('wizard.acknowledge')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {phase === 'skipped' ? (
          <div className="space-y-4">
            <SepaSkippedTable
              rows={skipped.map((entry) => ({
                id: entry.loanId,
                lenderName: entry.lenderName,
                loans: String(entry.loanNumber),
                reason: skippedReasons(entry)
                  .map((reason) => t(`sepa.reasons.${reason}`))
                  .join(', '),
              }))}
            />
            <div className="flex justify-end">
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {t('wizard.close')}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
