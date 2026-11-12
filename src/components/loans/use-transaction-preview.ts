'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { previewTransactionAction } from '@/actions/loans';
import type { TransactionFormData } from '@/lib/schemas/transaction';
import { NumberParser } from '@/lib/utils';

const parser = new NumberParser('de-DE');

/** The amount as typed in the form (German number format), or undefined while it is empty or invalid. */
export const parseAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const parsed = parser.parse(value);
  return parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const useDebounced = <T>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/**
 * The validated preview for the date, type and amount currently entered in the transaction form.
 * Create and edit use the same query; an edit passes `transactionId`.
 */
export function useTransactionPreview({
  loanId,
  transactionId,
  control,
  enabled = true,
}: {
  loanId: string;
  transactionId?: string;
  control: Control<TransactionFormData>;
  /** Only query while the form is shown. */
  enabled?: boolean;
}) {
  const date = useWatch({ control, name: 'date' });
  const type = useWatch({ control, name: 'type' });
  const amount = parseAmount(useWatch({ control, name: 'amount' }));
  const debouncedAmount = useDebounced(amount, 300);

  const day = date && moment(date).isValid() ? moment(date).startOf('day') : null;
  const selectedType = (type as string) === '' ? undefined : type;

  const query = useQuery({
    queryKey: ['transaction-preview', loanId, transactionId, day?.format('YYYY-MM-DD'), selectedType, debouncedAmount],
    enabled: enabled && !!day,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await previewTransactionAction({
        loanId,
        transactionId,
        date: (day as moment.Moment).toDate(),
        type: selectedType,
        amount: debouncedAmount,
      });
      if (result?.serverError || result?.validationErrors) {
        toast.error(result.serverError);
        return null;
      }
      return result?.data?.preview ?? null;
    },
  });

  return {
    preview: query.data ?? null,
    /** True while the shown preview belongs to older input than the form currently holds. */
    isPending: query.isFetching || amount !== debouncedAmount,
  };
}
