'use client'

import { FormDatePicker } from '@/components/form/form-date-picker'
import { FormNumberInput } from '@/components/form/form-number-input'
import { FormSelect } from '@/components/form/form-select'
import { TransactionFormData } from '@/lib/schemas/transaction'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface TransactionFormFieldsProps {
  form: UseFormReturn<TransactionFormData>
}

export function TransactionFormFields({ form }: TransactionFormFieldsProps) {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')

  return (
    <>
      <FormSelect
        form={form}
        name="type"
        label={t('transactions.type')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        options={[
          { value: 'DEPOSIT', label: commonT('enums.transaction.type.DEPOSIT') },
          { value: 'WITHDRAWAL', label: commonT('enums.transaction.type.WITHDRAWAL') },
          { value: 'INTEREST', label: commonT('enums.transaction.type.INTEREST') },
          { value: 'INTERESTPAYMENT', label: commonT('enums.transaction.type.INTERESTPAYMENT') },
          { value: 'TERMINATION', label: commonT('enums.transaction.type.TERMINATION') },
          { value: 'NOTRECLAIMEDPARTIAL', label: commonT('enums.transaction.type.NOTRECLAIMEDPARTIAL') },
          { value: 'NOTRECLAIMED', label: commonT('enums.transaction.type.NOTRECLAIMED') },
        ]}
      />

      <FormDatePicker
        form={form}
        name="date"
        label={t('transactions.date')}
        placeholder={t('transactions.datePlaceholder')}
      />

      <FormNumberInput
        form={form}
        name="amount"
        label={t('transactions.amount')}
        placeholder={t('transactions.amountPlaceholder')}
        min={0.01}
        step={0.01}
      />

      <FormSelect
        form={form}
        name="paymentType"
        label={t('transactions.paymentType')}
        placeholder={commonT('ui.form.selectPlaceholder')}
        options={[
          { value: 'BANK', label: commonT('enums.transaction.paymentType.BANK') },
          { value: 'CASH', label: commonT('enums.transaction.paymentType.CASH') },
          { value: 'OTHER', label: commonT('enums.transaction.paymentType.OTHER') },
        ]}
      />
    </>
  )
} 