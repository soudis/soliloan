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

  return (
    <>
      <FormSelect
        form={form}
        name="type"
        label={t('transactions.type')}
        placeholder={t('transactions.typePlaceholder')}
        options={[
          { value: 'DEPOSIT', label: t('transactions.typeDeposit') },
          { value: 'WITHDRAWAL', label: t('transactions.typeWithdrawal') },
          { value: 'INTEREST', label: t('transactions.typeInterest') },
          { value: 'INTERESTPAYMENT', label: t('transactions.typeInterestPayment') },
          { value: 'TERMINATION', label: t('transactions.typeTermination') },
          { value: 'NOTRECLAIMEDPARTIAL', label: t('transactions.typeNotReclaimedPartial') },
          { value: 'NOTRECLAIMED', label: t('transactions.typeNotReclaimed') },
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
        placeholder={t('transactions.paymentTypePlaceholder')}
        options={[
          { value: 'BANK', label: t('transactions.paymentTypeBank') },
          { value: 'CASH', label: t('transactions.paymentTypeCash') },
          { value: 'OTHER', label: t('transactions.paymentTypeOther') },
        ]}
      />
    </>
  )
} 