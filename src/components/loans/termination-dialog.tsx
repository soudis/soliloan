'use client';

import { DurationType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { de, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { terminateLoanAction } from '@/actions/loans';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateLong } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

interface TerminationDialogProps {
  loan: LoanDetailsWithCalculations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toUTC = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
};

export function TerminationDialog({ loan, open, onOpenChange }: TerminationDialogProps) {
  const t = useTranslations('dashboard.loans.terminate');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const queryClient = useQueryClient();

  const [terminationDate, setTerminationDate] = useState<Date>(toUTC(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedEndDate =
    terminationDate && loan.terminationPeriod && loan.terminationPeriodType
      ? moment(terminationDate)
          .add(loan.terminationPeriod, loan.terminationPeriodType === DurationType.MONTHS ? 'months' : 'years')
          .toDate()
      : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTerminationDate(toUTC(new Date()));
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full pl-3 text-left font-normal', !terminationDate && 'text-muted-foreground')}
                >
                  {terminationDate ? (
                    formatDateLong(terminationDate, locale)
                  ) : (
                    <span>{t('terminationDatePlaceholder')}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={terminationDate}
                  onSelect={(date) => {
                    if (date) {
                      setTerminationDate(toUTC(date));
                    }
                    setCalendarOpen(false);
                  }}
                  autoFocus
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {calculatedEndDate && (
            <p className="text-sm text-muted-foreground">
              {t('contractEnd', { date: formatDateLong(calculatedEndDate, locale) })}
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
