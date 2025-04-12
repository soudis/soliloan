'use client'

import { FormDatePicker } from '@/components/form/form-date-picker'
import { FormNumberInput } from '@/components/form/form-number-input'
import { FormSelect } from '@/components/form/form-select'
import { LenderCombobox } from '@/components/loans/lender-combobox'
import type { LoanFormData } from '@/lib/schemas/loan'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'

interface LoanFormFieldsProps {
  form: UseFormReturn<LoanFormData>
}

export function LoanFormFields({ form }: LoanFormFieldsProps) {
  const t = useTranslations('dashboard.loans')
  const commonT = useTranslations('common')
  const terminationType = form.watch('terminationType')

  return (
    <>
      {/* General Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.generalInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LenderCombobox
            form={form}
            name="lenderId"
            label={t('new.form.lender') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
          />

          <FormDatePicker
            form={form}
            name="signDate"
            label={t('new.form.signDate') + ' *'}
            placeholder={commonT('ui.form.enterPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            form={form}
            name="amount"
            label={t('new.form.amount') + ' *'}
            placeholder={commonT('ui.form.enterPlaceholder')}
            min={0.01}
            step={0.01}
          />

          <FormNumberInput
            form={form}
            name="interestRate"
            label={t('new.form.interestRate') + ' *'}
            placeholder={commonT('ui.form.enterPlaceholder')}
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* Termination Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.terminationInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="terminationType"
            label={t('new.form.terminationType') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'ENDDATE', label: commonT('enums.loan.terminationType.ENDDATE') },
              { value: 'TERMINATION', label: commonT('enums.loan.terminationType.TERMINATION') },
              { value: 'DURATION', label: commonT('enums.loan.terminationType.DURATION') },
            ]}
          />
        </div>

        {/* Conditional fields based on terminationType */}
        {terminationType === 'ENDDATE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormDatePicker
              form={form}
              name="endDate"
              label={t('new.form.endDate') + ' *'}
              placeholder={commonT('ui.form.enterPlaceholder')}
            />
          </div>
        )}

        {terminationType === 'TERMINATION' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberInput
              form={form}
              name="terminationPeriod"
              label={t('new.form.terminationPeriod') + ' *'}
              placeholder={commonT('ui.form.enterPlaceholder')}
              min={1}
            />

            <FormSelect
              form={form}
              name="terminationPeriodType"
              label={t('new.form.terminationPeriodType') + ' *'}
              placeholder={commonT('ui.form.selectPlaceholder')}
              options={[
                { value: 'MONTHS', label: commonT('enums.loan.durationUnit.MONTHS') },
                { value: 'YEARS', label: commonT('enums.loan.durationUnit.YEARS') },
              ]}
            />

            <FormDatePicker
              form={form}
              name="terminationDate"
              label={t('new.form.terminationDate')}
              placeholder={commonT('ui.form.enterPlaceholder')}
            />
          </div>
        )}

        {terminationType === 'DURATION' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberInput
              form={form}
              name="duration"
              label={t('new.form.duration') + ' *'}
              placeholder={commonT('ui.form.enterPlaceholder')}
              min={1}
            />

            <FormSelect
              form={form}
              name="durationType"
              label={t('new.form.durationType') + ' *'}
              placeholder={commonT('ui.form.selectPlaceholder')}
              options={[
                { value: 'MONTHS', label: commonT('enums.loan.durationUnit.MONTHS') },
                { value: 'YEARS', label: commonT('enums.loan.durationUnit.YEARS') },
              ]}
            />
          </div>
        )}
      </div>

      {/* Additional Information Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-muted-foreground">{t('new.form.additionalInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="interestPaymentType"
            label={t('new.form.interestPaymentType') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'YEARLY', label: commonT('enums.loan.interestPaymentType.YEARLY') },
              { value: 'END', label: commonT('enums.loan.interestPaymentType.END') },
            ]}
          />

          <FormSelect
            form={form}
            name="interestPayoutType"
            label={t('new.form.interestPayoutType') + ' *'}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'MONEY', label: commonT('enums.loan.interestPayoutType.MONEY') },
              { value: 'COUPON', label: commonT('enums.loan.interestPayoutType.COUPON') },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="altInterestMethod"
            label={t('new.form.altInterestMethod')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'ACT365NOCOMPOUND', label: commonT('enums.interestMethod.ACT365NOCOMPOUND') },
              { value: 'E30360NOCOMPOUND', label: commonT('enums.interestMethod.E30360NOCOMPOUND') },
              { value: 'ACT360NOCOMPOUND', label: commonT('enums.interestMethod.ACT360NOCOMPOUND') },
              { value: 'ACTACTNOCOMPOUND', label: commonT('enums.interestMethod.ACTACTNOCOMPOUND') },
              { value: 'ACT365COMPOUND', label: commonT('enums.interestMethod.ACT365COMPOUND') },
              { value: 'E30360COMPOUND', label: commonT('enums.interestMethod.E30360COMPOUND') },
              { value: 'ACT360COMPOUND', label: commonT('enums.interestMethod.ACT360COMPOUND') },
              { value: 'ACTACTCOMPOUND', label: commonT('enums.interestMethod.ACTACTCOMPOUND') },
            ]}
          />

          <FormSelect
            form={form}
            name="contractStatus"
            label={t('new.form.contractStatus')}
            placeholder={commonT('ui.form.selectPlaceholder')}
            options={[
              { value: 'PENDING', label: commonT('enums.loan.contractStatus.PENDING') },
              { value: 'COMPLETED', label: commonT('enums.loan.contractStatus.COMPLETED') },
            ]}
          />
        </div>
      </div>
    </>
  )
} 