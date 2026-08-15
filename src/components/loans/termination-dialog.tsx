'use client';

import { DurationType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { terminateLoanAction } from '@/actions/loans';
import { Button } from '@/components/ui/button';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateLong, toUTCDate } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

interface TerminationDialogProps {
  loan: LoanDetailsWithCalculations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminationDialog({ loan, open, onOpenChange }: TerminationDialogProps) {
  const t = useTranslations('dashboard.loans.terminate');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [terminationDate, setTerminationDate] = useState<Date>(() => toUTCDate(new Date()) ?? new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedEndDate =
    terminationDate && loan.terminationPeriod && loan.terminationPeriodType
      ? moment(terminationDate)
          .add(loan.terminationPeriod, loan.terminationPeriodType === DurationType.MONTHS ? 'months' : 'years')
          .toDate()
      : null;

  const terminationPeriodLabel =
    loan.terminationPeriod && loan.terminationPeriodType
      ? ` (${loan.terminationPeriod} ${commonT(`enums.loan.durationUnit.${loan.terminationPeriodType}`)})`
      : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTerminationDate(toUTCDate(new Date()) ?? new Date());
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading(t('loading'));
    try {
      const result = await terminateLoanAction({
        loanId: loan.id,
        terminationDate,
      });
      if (result?.serverError || result?.validationErrors) {
        toast.error(t('error'), { id: toastId });
      } else {
        toast.success(t('success'), { id: toastId });
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: ['lender', loan.lender.id] });
      }
    } catch {
      toast.error(t('error'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('terminationDate')}</span>
            <DatePickerInput
              value={terminationDate}
              onChange={(date) => {
                if (date) {
                  setTerminationDate(date);
                }
              }}
              placeholder={t('terminationDatePlaceholder')}
            />
          </div>

          {calculatedEndDate && (
            <p className="text-sm text-muted-foreground">
              {t('contractEnd', { date: formatDateLong(calculatedEndDate, locale) })}
              {terminationPeriodLabel}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!terminationDate || isSubmitting}>
            {isSubmitting ? t('confirming') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
