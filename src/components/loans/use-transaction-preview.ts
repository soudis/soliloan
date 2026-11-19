'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { previewTransactionAction } from '@/actions/loans';
import type { TransactionPreview } from '@/lib/loans/transaction-validation';
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
 *
 * `ready` turns true once the first preview for the input of this opening has arrived (and `settled`
 * holds for it) and stays true until the form is closed: the modal is only shown then, so it does not
 * jump when the check data arrives (docs/agents/ui.md). `failed` is set when that first preview could
 * not be loaded.
 */
export function useTransactionPreview({
  loanId,
  transactionId,
  control,
  enabled = true,
  settled = () => true,
}: {
  loanId: string;
  transactionId?: string;
  control: Control<TransactionFormData>;
  /** Only query while the form is shown. */
  enabled?: boolean;
  /** False while the form is about to change its input in reaction to the preview (e.g. preselecting a type). */
  settled?: (preview: TransactionPreview) => boolean;
}) {
  const date = useWatch({ control, name: 'date' });
  const type = useWatch({ control, name: 'type' });
  const amount = parseAmount(useWatch({ control, name: 'amount' }));
  const debouncedAmount = useDebounced(amount, 300);

  // When the form opens: only data fetched after this moment counts as loaded
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setOpenedAt(enabled ? Date.now() : null);
    setReady(false);
  }, [enabled]);

  // The first check uses the amount as it is, only later typing is debounced
  const queryAmount = ready ? debouncedAmount : amount;
  const day = date && moment(date).isValid() ? moment(date).startOf('day') : null;
  const selectedType = (type as string) === '' ? undefined : type;

  const query = useQuery({
    queryKey: ['transaction-preview', loanId, transactionId, day?.format('YYYY-MM-DD'), selectedType, queryAmount],
    enabled: enabled && !!day,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const result = await previewTransactionAction({
          loanId,
          transactionId,
          date: (day as moment.Moment).toDate(),
          type: selectedType,
          amount: queryAmount,
        });
        if (result?.serverError || result?.validationErrors) {
          toast.error(result.serverError);
          return null;
        }
        return result?.data?.preview ?? null;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        return null;
      }
    },
  });

  // Fetched after opening, for the input the form holds now (not the previous input's placeholder)
  const loaded = openedAt !== null && !query.isFetching && !query.isPlaceholderData && query.dataUpdatedAt >= openedAt;
  const preview = query.data ?? null;
  const isSettled = !!preview && settled(preview);
  // Wait for the debounce to catch up too: switching to it must not refetch with an older amount
  const caughtUp = debouncedAmount === amount;
  useEffect(() => {
    if (!ready && loaded && isSettled && caughtUp) {
      setReady(true);
    }
  }, [ready, loaded, isSettled, caughtUp]);

  return {
    preview,
    /** True while the shown preview belongs to older input than the form currently holds. */
    isPending: query.isFetching || amount !== queryAmount,
    ready,
    failed: !ready && loaded && !preview,
  };
}
