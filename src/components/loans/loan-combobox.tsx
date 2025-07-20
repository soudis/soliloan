'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FormCombobox } from '@/components/form/form-combobox';
import type { LoanWithCalculations } from '@/types/loans';
import { LoanSelectorItemRow } from '../lenders/loan-selector-item-row';

type LenderComboboxProps = {
  name: string;
  label: string;
  placeholder: string;
  disabled?: boolean;
  loans: LoanWithCalculations[];
  isLoading?: boolean;
};

export function LoanCombobox({
  name,
  label,
  placeholder,
  disabled = false,
  loans,
  isLoading = false,
}: LenderComboboxProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const form = useFormContext();

  // Format lender options for the combobox
  const lenderOptions = loans.map((loan) => ({
    value: loan.id,
    label: loan.loanNumber.toString(),
    customContent: <LoanSelectorItemRow loan={loan} highlightActive={false} />,
  }));

  return (
    <FormCombobox
      form={form}
      name={name}
      label={label}
      placeholder={isLoading ? t('new.form.loadingLenders') : placeholder || commonT('ui.form.selectPlaceholder')}
      options={lenderOptions}
      disabled={disabled}
    />
  );
}
