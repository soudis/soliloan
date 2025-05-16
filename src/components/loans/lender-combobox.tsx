'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FormCombobox } from '@/components/form/form-combobox';

interface Lender {
  id: string;
  lenderNumber: number;
  type: 'PERSON' | 'ORGANISATION';
  firstName: string | null;
  lastName: string | null;
  organisationName: string | null;
  titlePrefix: string | null;
  titleSuffix: string | null;
}

interface LenderComboboxProps {
  name: string;
  label: string;
  placeholder: string;
  disabled?: boolean;
  lenders: Lender[];
  isLoading?: boolean;
}

export function LenderCombobox({
  name,
  label,
  placeholder,
  disabled = false,
  lenders,
  isLoading = false,
}: LenderComboboxProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const form = useFormContext();

  // Format lender options for the combobox
  const lenderOptions = lenders.map((lender) => ({
    value: lender.id,
    label:
      lender.type === 'PERSON'
        ? `${lender.titlePrefix ? `${lender.titlePrefix} ` : ''}${lender.firstName} ${lender.lastName}${lender.titleSuffix ? ` ${lender.titleSuffix}` : ''}`
        : lender.organisationName || '',
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
