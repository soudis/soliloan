'use client';

import { TransactionType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { getLoanAction } from '@/actions';
import { FormDatePicker } from '@/components/form/form-date-picker';
import { FormSelect } from '@/components/form/form-select';
import type { TransactionFormData } from '@/lib/schemas/transaction';

import { toast } from 'sonner';
import { FormNumberInput } from '../form/form-number-input';

const formatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function TransactionFormFields({ loanId }: { loanId: string }) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const { watch, setValue } = useFormContext<TransactionFormData>();
  const [amountCalculated, setAmountCalculated] = useState(false);
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);

  const date = watch('date');
  const type = watch('type');

  const { data: loanToDate, isLoading: isLoadingLoanToDate } = useQuery({
    queryKey: ['loan', loanId, date],
    queryFn: async () => {
      const result = await getLoanAction({ loanId, date: (date ?? '') === '' ? new Date() : (date ?? new Date()) });
      if (result?.serverError || result?.validationErrors) {
        toast.error(result.serverError);
      }
      return result.data?.loan ?? null;
    },
  });

  useEffect(() => {
    if (loanToDate?.transactions.length === 0 && (type as string) === '') {
      setValue('type', TransactionType.DEPOSIT);
    }
  }, [loanToDate, type, setValue]);

  useEffect(() => {
    if (loanToDate && !isLoadingLoanToDate) {
      if (type === TransactionType.DEPOSIT) {
        setMinAmount(0.01);
        setMaxAmount(loanToDate.amount);
      }
      if (type === TransactionType.WITHDRAWAL || type === TransactionType.NOTRECLAIMEDPARTIAL) {
        setMaxAmount(loanToDate.balance - 0.01);
        setMinAmount(0.01);
      }
      if (type === TransactionType.INTERESTPAYMENT) {
        setMaxAmount(Math.min(loanToDate.interest + loanToDate.interestPaid, loanToDate.balance - 0.01));
        setMinAmount(0.01);
      }
    }
  }, [type, loanToDate, isLoadingLoanToDate]);

  useEffect(() => {
    if (
      loanToDate &&
      !isLoadingLoanToDate &&
      !!date &&
      (type === TransactionType.TERMINATION || type === TransactionType.NOTRECLAIMED)
    ) {
      setValue('amount', formatter.format(loanToDate.balance) as unknown as number);
      setAmountCalculated(true);
    }
    if (
      loanToDate &&
      amountCalculated &&
      type !== TransactionType.TERMINATION &&
      type !== TransactionType.NOTRECLAIMED
    ) {
      setValue('amount', '' as unknown as number);
      setAmountCalculated(false);
    }
  }, [type, loanToDate, setValue, isLoadingLoanToDate, date, amountCalculated]);

  const createTypeOption = (type: TransactionType, disabled?: boolean) => ({
    value: type,
    label: commonT(`enums.transaction.type.${type}`),
    disabled,
  });

  const latestTransaction = useMemo(() => {
    return loanToDate?.transactions.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  }, [loanToDate]);

  return (
    <>
      <FormSelect
        name="type"
        label={t('transactions.type')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        options={[
          createTypeOption(TransactionType.DEPOSIT, !!loanToDate && loanToDate?.deposits >= loanToDate.amount),
          'divider',
          createTypeOption(TransactionType.WITHDRAWAL, !loanToDate || loanToDate?.balance <= 0),
          createTypeOption(TransactionType.TERMINATION, !loanToDate || loanToDate?.balance <= 0),
          'divider',
          createTypeOption(
            TransactionType.INTERESTPAYMENT,
            !loanToDate || loanToDate.interest + loanToDate.interestPaid <= 0 || !loanToDate || loanToDate.balance <= 0,
          ),
          'divider',
          createTypeOption(TransactionType.NOTRECLAIMEDPARTIAL, !loanToDate || loanToDate.balance <= 0),
          createTypeOption(TransactionType.NOTRECLAIMED, !loanToDate || loanToDate.balance <= 0),
        ]}
      />

      <FormDatePicker
        name="date"
        label={t('transactions.date')}
        placeholder={commonT('ui.form.enterPlaceholder')}
        disabled={(date) => {
          if (date > new Date()) {
            return true;
          }
          if (
            latestTransaction &&
            moment(date).startOf('day').isBefore(moment(latestTransaction.date).startOf('day'))
          ) {
            return true;
          }
          return false;
        }}
      />

      <FormNumberInput
        name="amount"
        label={t('transactions.amount')}
        placeholder={commonT('ui.form.enterPlaceholder')}
        min={minAmount}
        max={maxAmount}
        prefix="€"
        disabled={
          !type ||
          type === TransactionType.TERMINATION ||
          type === TransactionType.NOTRECLAIMED ||
          isLoadingLoanToDate ||
          !date
        }
      />

      <FormSelect
        name="paymentType"
        label={t('transactions.paymentType')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        options={[
          {
            value: 'BANK',
            label: commonT('enums.transaction.paymentType.BANK'),
          },
          {
            value: 'CASH',
            label: commonT('enums.transaction.paymentType.CASH'),
          },
          {
            value: 'OTHER',
            label: commonT('enums.transaction.paymentType.OTHER'),
          },
        ]}
      />
    </>
  );
}
