'use client';

import { TransactionType } from '@prisma/client';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormDatePicker } from '@/components/form/form-date-picker';
import { FormSelect } from '@/components/form/form-select';
import { isClosingType } from '@/lib/loans/transaction-ledger';
import { BOOKABLE_TYPES, DRAFT_TRANSACTION_ID, type TransactionPreview } from '@/lib/loans/transaction-validation';
import type { TransactionFormData } from '@/lib/schemas/transaction';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { FormNumberInput } from '../form/form-number-input';
import {
  TransactionAlerts,
  TransactionStateSummary,
  useUnavailableReason,
  useViolationMessage,
} from './transaction-preview-panels';

const formatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TYPE_ORDER: (TransactionType | 'divider')[] = [
  TransactionType.DEPOSIT,
  'divider',
  TransactionType.WITHDRAWAL,
  TransactionType.TERMINATION,
  'divider',
  TransactionType.INTERESTPAYMENT,
  'divider',
  TransactionType.NOTRECLAIMEDPARTIAL,
  TransactionType.NOTRECLAIMED,
];

export function TransactionFormFields({
  preview,
  isPending = false,
  transactionId,
  originalType,
}: {
  /** Validated preview for the current form input, see `useTransactionPreview`. */
  preview: TransactionPreview | null;
  /** The preview belongs to older input; it is dimmed until the new one arrives. */
  isPending?: boolean;
  /** Set when an existing Zahlung is edited. */
  transactionId?: string;
  originalType?: TransactionType;
}) {
  const t = useTranslations('dashboard.loans');
  const modalT = useTranslations('dashboard.loans.transactions.modal');
  const commonT = useTranslations('common');
  const { watch, setValue } = useFormContext<TransactionFormData>();
  const locale = useLocale();
  const autoFilled = useRef(false);

  const date = watch('date');
  const type = watch('type') as TransactionType | '';
  const selectedType = type === '' ? undefined : type;
  const candidateId = transactionId ?? DRAFT_TRANSACTION_ID;
  const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : undefined;

  const unavailableReason = useUnavailableReason(candidateId);
  const violationMessage = useViolationMessage();

  // Rückzahlung / Erlassung always take the Kontostand of the day. An edit keeps the stored amount
  // until the user chooses "Neu berechnen", unless the type was changed to a closing type.
  const closingAmount = preview?.closingAmount;
  const keepStoredAmount = !!transactionId && selectedType === originalType;
  useEffect(() => {
    if (selectedType && isClosingType(selectedType) && closingAmount != null && !keepStoredAmount) {
      setValue('amount', formatter.format(closingAmount) as unknown as number, { shouldValidate: true });
      autoFilled.current = true;
    } else if (selectedType && !isClosingType(selectedType) && autoFilled.current) {
      setValue('amount', '' as unknown as number);
      autoFilled.current = false;
    }
  }, [selectedType, closingAmount, keepStoredAmount, setValue]);

  // Nothing to choose from: preselect the only possible type (e.g. the first Einzahlung)
  const availableTypes = preview ? BOOKABLE_TYPES.filter((item) => preview.types[item]?.available) : [];
  const onlyAvailableType = availableTypes.length === 1 ? availableTypes[0] : undefined;
  useEffect(() => {
    if (!selectedType && onlyAvailableType) {
      setValue('type', onlyAvailableType);
    }
  }, [selectedType, onlyAvailableType, setValue]);

  const options = TYPE_ORDER.map((item) => {
    if (item === 'divider') {
      return item;
    }
    const availability = preview?.types[item];
    const reason = availability && !availability.available ? unavailableReason(availability.reason) : undefined;
    const label = commonT(`enums.transaction.type.${item}`);
    return {
      value: item,
      label: reason ? `${label} (${reason})` : label,
      disabled: !!availability && !availability.available,
    };
  });

  // After a Rückzahlung / Erlassung nothing is possible any more: say so once instead of per type
  const loanClosed = !!preview && BOOKABLE_TYPES.every((item) => preview.types[item]?.reason?.rule === 'AFTER_CLOSING');
  const selectedAvailability = selectedType ? preview?.types[selectedType] : undefined;
  let unavailableMessage: string | undefined;
  if (loanClosed) {
    unavailableMessage = modalT('closedLoan');
  } else if (selectedAvailability && !selectedAvailability.available) {
    unavailableMessage = selectedAvailability.reason
      ? violationMessage(selectedAvailability.reason)
      : modalT('noTypeAvailable');
  }

  const limits = preview?.limits;
  const binding = limits?.binding;
  let limitNote: string | undefined;
  if (binding) {
    if (binding.transactionId !== candidateId) {
      limitNote = modalT('limitedByTransaction', {
        type: commonT(`enums.transaction.type.${binding.type}`),
        date: formatDateShort(binding.date, locale),
      });
    } else {
      limitNote = binding.rule === 'CAP_EXCEEDED' ? modalT('limitedByLoanAmount') : modalT('limitedByBalance');
    }
  }

  const recalculate = () => {
    if (closingAmount != null) {
      setValue('amount', formatter.format(closingAmount) as unknown as number, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };
  const canRecalculate = !!transactionId && !!selectedType && isClosingType(selectedType);

  return (
    <>
      <FormDatePicker
        name="date"
        label={t('transactions.date')}
        placeholder={commonT('ui.form.enterPlaceholder')}
        className="bg-white"
      />

      {preview && validDate ? (
        <div className={cn('transition-opacity', isPending && 'opacity-50')} aria-busy={isPending}>
          <TransactionStateSummary preview={preview} date={validDate} />
        </div>
      ) : null}

      <FormSelect
        name="type"
        label={t('transactions.type')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        className="bg-white"
        options={options}
      />

      <div className="space-y-1.5">
        <FormNumberInput
          name="amount"
          label={t('transactions.amount')}
          placeholder={commonT('ui.form.enterPlaceholder')}
          min={limits?.min}
          max={limits?.max}
          prefix="€"
          className="bg-white"
          disabled={!selectedType || isClosingType(selectedType) || !validDate}
        />
        {limits && selectedType ? (
          <p className="text-xs text-muted-foreground">
            {isClosingType(selectedType) && validDate
              ? modalT('closingAmountHint', { date: formatDateShort(validDate, locale) })
              : modalT('amountRange', { min: formatCurrency(limits.min), max: formatCurrency(limits.max) })}
            {limitNote ? ` · ${limitNote}` : null}
            {!isClosingType(selectedType) ? (
              <>
                {' · '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() =>
                    setValue('amount', formatter.format(limits.max) as unknown as number, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  {modalT('useMax')}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <FormSelect
        name="paymentType"
        label={t('transactions.paymentType')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        className="bg-white"
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

      {preview ? (
        <div className={cn('transition-opacity', isPending && 'opacity-50')} aria-busy={isPending}>
          <TransactionAlerts
            preview={preview}
            unavailableMessage={unavailableMessage}
            onRecalculate={canRecalculate ? recalculate : undefined}
          />
        </div>
      ) : null}
    </>
  );
}
