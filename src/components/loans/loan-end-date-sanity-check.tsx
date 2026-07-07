'use client';

import { useLocale } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormSanityChecks } from '@/components/form/form-sanity-checks-provider';
import { evaluateLoanEndDateSanityChecks, resolveContractEndDate } from '@/lib/loans/loan-end-date-sanity-check';
import { resolveSavingsLastDepositDate } from '@/lib/loans/savings-contract';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { formatDateLong } from '@/lib/utils';

const BEFORE_SAVINGS_LAST_DEPOSIT_WARNING_ID = 'loan-end-before-savings-last-deposit';

export function LoanEndDateSanityCheck() {
  const locale = useLocale();
  const { setWarning } = useFormSanityChecks();
  const form = useFormContext<LoanFormClientData>();

  const terminationType = form.watch('terminationType');
  const signDate = form.watch('signDate');
  const endDate = form.watch('endDate');
  const duration = form.watch('duration');
  const durationType = form.watch('durationType');
  const isSavingsContract = form.watch('isSavingsContract');
  const savingsFirstDepositDate = form.watch('savingsFirstDepositDate');
  const savingsLastDepositDate = form.watch('savingsLastDepositDate');
  const savingsDepositCount = form.watch('savingsDepositCount');

  const checkInput = useMemo(
    () => ({
      terminationType,
      signDate,
      endDate,
      duration,
      durationType,
      isSavingsContract,
      savingsFirstDepositDate,
      savingsLastDepositDate,
      savingsDepositCount,
    }),
    [
      terminationType,
      signDate,
      endDate,
      duration,
      durationType,
      isSavingsContract,
      savingsFirstDepositDate,
      savingsLastDepositDate,
      savingsDepositCount,
    ],
  );

  const failedChecks = useMemo(() => evaluateLoanEndDateSanityChecks(checkInput), [checkInput]);
  const contractEndDate = useMemo(() => resolveContractEndDate(checkInput), [checkInput]);

  useEffect(() => {
    const resolvedLastDepositDate = resolveSavingsLastDepositDate(
      savingsFirstDepositDate instanceof Date
        ? savingsFirstDepositDate
        : savingsFirstDepositDate
          ? new Date(savingsFirstDepositDate)
          : null,
      savingsLastDepositDate instanceof Date
        ? savingsLastDepositDate
        : savingsLastDepositDate
          ? new Date(savingsLastDepositDate)
          : null,
      typeof savingsDepositCount === 'number' ? savingsDepositCount : null,
    );

    if (failedChecks.includes('beforeSavingsLastDepositDate') && contractEndDate && resolvedLastDepositDate) {
      setWarning(BEFORE_SAVINGS_LAST_DEPOSIT_WARNING_ID, {
        id: BEFORE_SAVINGS_LAST_DEPOSIT_WARNING_ID,
        messageKey: 'endDateBeforeSavingsLastDepositDate',
        messageNamespace: 'dashboard.loans.sanityChecks',
        messageValues: {
          endDate: formatDateLong(contractEndDate, locale),
          lastDepositDate: formatDateLong(resolvedLastDepositDate, locale),
        },
      });
    } else {
      setWarning(BEFORE_SAVINGS_LAST_DEPOSIT_WARNING_ID, null);
    }

    return () => setWarning(BEFORE_SAVINGS_LAST_DEPOSIT_WARNING_ID, null);
  }, [
    contractEndDate,
    failedChecks,
    locale,
    savingsDepositCount,
    savingsFirstDepositDate,
    savingsLastDepositDate,
    setWarning,
  ]);

  return null;
}
