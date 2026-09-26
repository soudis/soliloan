'use client';

import moment from 'moment';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { buildOutboundSepaAction } from '@/actions/processes/mutations/build-outbound-sepa';
import { PaymentDetails } from '@/components/processes/payment-details';
import { SepaSkippedTable } from '@/components/processes/sepa-skipped-table';
import { StepProgress } from '@/components/processes/step-progress';
import { Button } from '@/components/ui/button';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { downloadXml } from '@/lib/processes/download-xml';
import {
  type DebtorGap,
  groupPayoutRows,
  type PayoutGrouping,
  type PayoutRow,
  projectSepaGaps,
} from '@/lib/processes/payout-groups';
import type { YearlyInterestLenderView } from '@/lib/processes/yearly-interest-view';
import { getLenderName, toUTCDate } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import type { TransactionListItem } from '@/types/transactions';

type Props = {
  open: boolean;
  mode: 'sepa' | 'stepper';
  rows: TransactionListItem[];
  project: ProjectWithConfiguration;
  projectId: string;
  onOpenChange: (open: boolean) => void;
};

type Skipped = {
  lenderName: string;
  loanNumbers: number[];
  reasons?: string[];
  missing?: string[];
};

function skippedReasons(entry: { reasons?: string[]; missing?: string[] }) {
  return entry.reasons ?? entry.missing ?? [];
}

function toPayoutRows(rows: TransactionListItem[]): PayoutRow[] {
  return rows.map((row) => ({
    id: row.id,
    loanId: row.loan.id,
    loanNumber: row.loan.loanNumber,
    lenderId: row.loan.lender.id,
    lenderName: getLenderName(row.loan.lender),
    iban: row.loan.lender.iban,
    bic: row.loan.lender.bic,
    type: row.type,
    amount: Math.abs(row.amount),
    year: moment(row.date).year(),
  }));
}

function lenderFor(rows: TransactionListItem[], lenderId: string): YearlyInterestLenderView | undefined {
  const lender = rows.find((row) => row.loan.lender.id === lenderId)?.loan.lender;
  if (!lender) return undefined;
  return {
    id: lender.id,
    name: getLenderName(lender),
    email: lender.email,
    iban: lender.iban,
    bic: lender.bic,
    street: lender.street,
    addon: lender.addon,
    zip: lender.zip,
    place: lender.place,
    country: lender.country,
  };
}

export function OutboundPaymentDialog({ open, mode, rows, project, projectId, onOpenChange }: Props) {
  const t = useTranslations('processes');
  const tOutbound = useTranslations('dashboard.transactions.outbound');
  const [grouping, setGrouping] = useState<PayoutGrouping | null>(null);
  const [executionDate, setExecutionDate] = useState<Date | null>(new Date());
  const [phase, setPhase] = useState<'choose' | 'steps' | 'skipped'>('choose');
  const [stepIndex, setStepIndex] = useState(0);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sepaGaps = projectSepaGaps(project.configuration);
  const groups = useMemo(() => (grouping ? groupPayoutRows(toPayoutRows(rows), grouping, true) : []), [grouping, rows]);
  const step = groups[stepIndex];
  const lender = step ? lenderFor(rows, step.lenderId) : undefined;

  const reset = () => {
    setGrouping(null);
    setExecutionDate(new Date());
    setPhase('choose');
    setStepIndex(0);
    setSkipped([]);
    setIsSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const download = async () => {
    if (!grouping || !executionDate) return;
    const utcDate = toUTCDate(executionDate);
    if (!utcDate) return;
    setIsSubmitting(true);
    const result = await buildOutboundSepaAction({
      projectId,
      transactionIds: rows.map((row) => row.id),
      grouping,
      executionDate: utcDate,
    });
    setIsSubmitting(false);
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('sepa.noFile'));
      return;
    }
    if (result.data.xml) {
      downloadXml(`sepa-${utcDate.toISOString().slice(0, 10)}.xml`, result.data.xml);
    } else {
      toast.error(t('sepa.noFile'));
    }
    if (result.data.skipped.length > 0) {
      setSkipped(result.data.skipped);
      setPhase('skipped');
      return;
    }
    handleOpenChange(false);
  };

  const gapLabel = (gap: DebtorGap | 'iban' | 'name') =>
    gap === 'bic' || gap === 'name' || gap === 'iban' ? t(`sepa.gaps.${gap}`) : gap;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        {...(phase === 'steps' ? { 'aria-describedby': undefined } : {})}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'sepa' ? tOutbound('sepa') : tOutbound('assistant')}</DialogTitle>
          {phase !== 'steps' ? (
            <DialogDescription>
              {phase === 'skipped'
                ? t('sepa.skippedExportDescription')
                : mode === 'sepa'
                  ? t('sepa.description')
                  : t('wizard.reviewDescription')}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {phase === 'choose' ? (
          <div className="space-y-4">
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
              <p className="text-sm text-muted-foreground">{t('grouping.hintOutbound')}</p>
              {!grouping ? <p className="text-sm text-muted-foreground">{t('grouping.required')}</p> : null}
            </div>
            {mode === 'sepa' ? (
              sepaGaps.length > 0 ? (
                <p className="text-sm text-destructive">
                  {t('sepa.disabled', { fields: sepaGaps.map((gap) => gapLabel(gap)).join(', ') })}
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm">{t('sepa.executionDate')}</div>
                  <DatePickerInput value={executionDate} onChange={setExecutionDate} />
                </div>
              )
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('wizard.close')}
              </Button>
              {mode === 'sepa' ? (
                <Button
                  type="button"
                  disabled={!grouping || sepaGaps.length > 0 || !executionDate || isSubmitting}
                  onClick={() => void download()}
                >
                  {t('sepa.download')}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!grouping}
                  onClick={() => {
                    setPhase('steps');
                    setStepIndex(0);
                  }}
                >
                  {tOutbound('assistant')}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {phase === 'steps' && step && lender ? (
          <div className="space-y-4">
            <StepProgress current={stepIndex + 1} total={groups.length} name={step.lenderName} />
            <PaymentDetails
              lender={lender}
              lines={step.rows.map((row) => ({ id: row.id, loanNumber: row.loanNumber, amount: row.amount }))}
              purpose={step.purpose}
            />
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => current - 1)}
              >
                {t('wizard.back')}
              </Button>
              {stepIndex >= groups.length - 1 ? (
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  {t('wizard.close')}
                </Button>
              ) : (
                <Button type="button" onClick={() => setStepIndex((current) => current + 1)}>
                  {t('wizard.next')}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {phase === 'skipped' ? (
          <div className="space-y-4">
            <SepaSkippedTable
              rows={skipped.map((entry) => ({
                id: `${entry.lenderName}-${entry.loanNumbers.join('-')}`,
                lenderName: entry.lenderName,
                loans: entry.loanNumbers.join(', '),
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
