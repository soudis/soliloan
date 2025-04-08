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
            placeholder={t('new.form.lenderPlaceholder')}
          />

          <FormDatePicker
            form={form}
            name="signDate"
            label={t('new.form.signDate') + ' *'}
            placeholder={t('new.form.signDatePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberInput
            form={form}
            name="amount"
            label={t('new.form.amount') + ' *'}
            placeholder={t('new.form.amountPlaceholder')}
            min={0.01}
            step={0.01}
          />

          <FormNumberInput
            form={form}
            name="interestRate"
            label={t('new.form.interestRate') + ' *'}
            placeholder={t('new.form.interestRatePlaceholder')}
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
            placeholder={t('new.form.terminationTypePlaceholder')}
            options={[
              { value: 'ENDDATE', label: t('new.form.terminationTypeEndDate') },
              { value: 'TERMINATION', label: t('new.form.terminationTypeTermination') },
              { value: 'DURATION', label: t('new.form.terminationTypeDuration') },
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
              placeholder={t('new.form.endDatePlaceholder')}
            />
          </div>
        )}

        {terminationType === 'TERMINATION' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberInput
              form={form}
              name="terminationPeriod"
              label={t('new.form.terminationPeriod') + ' *'}
              placeholder={t('new.form.terminationPeriodPlaceholder')}
              min={1}
            />

            <FormSelect
              form={form}
              name="terminationPeriodType"
              label={t('new.form.terminationPeriodType') + ' *'}
              placeholder={t('new.form.terminationPeriodTypePlaceholder')}
              options={[
                { value: 'MONTHS', label: t('new.form.terminationPeriodTypeMonths') },
                { value: 'YEARS', label: t('new.form.terminationPeriodTypeYears') },
              ]}
            />

            <FormDatePicker
              form={form}
              name="terminationDate"
              label={t('new.form.terminationDate')}
              placeholder={t('new.form.terminationDatePlaceholder')}
            />
          </div>
        )}

        {terminationType === 'DURATION' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberInput
              form={form}
              name="duration"
              label={t('new.form.duration') + ' *'}
              placeholder={t('new.form.durationPlaceholder')}
              min={1}
            />

            <FormSelect
              form={form}
              name="durationType"
              label={t('new.form.durationType') + ' *'}
              placeholder={t('new.form.durationTypePlaceholder')}
              options={[
                { value: 'MONTHS', label: t('new.form.durationTypeMonths') },
                { value: 'YEARS', label: t('new.form.durationTypeYears') },
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
            placeholder={t('new.form.interestPaymentTypePlaceholder')}
            options={[
              { value: 'YEARLY', label: t('new.form.interestPaymentTypeYearly') },
              { value: 'END', label: t('new.form.interestPaymentTypeEnd') },
            ]}
          />

          <FormSelect
            form={form}
            name="interestPayoutType"
            label={t('new.form.interestPayoutType') + ' *'}
            placeholder={t('new.form.interestPayoutTypePlaceholder')}
            options={[
              { value: 'MONEY', label: t('new.form.interestPayoutTypeMoney') },
              { value: 'COUPON', label: t('new.form.interestPayoutTypeCoupon') },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            form={form}
            name="altInterestMethod"
            label={t('new.form.altInterestMethod')}
            placeholder={t('new.form.altInterestMethodPlaceholder')}
            options={[
              { value: 'ACT_365_NOCOMPOUND', label: t('new.form.altInterestMethodAct365NoCompound') },
              { value: 'E30_360_NOCOMPOUND', label: t('new.form.altInterestMethodE30360NoCompound') },
              { value: 'ACT_360_NOCOMPOUND', label: t('new.form.altInterestMethodAct360NoCompound') },
              { value: 'ACT_ACT_NOCOMPOUND', label: t('new.form.altInterestMethodActActNoCompound') },
              { value: 'ACT_365_COMPOUND', label: t('new.form.altInterestMethodAct365Compound') },
              { value: 'E30_360_COMPOUND', label: t('new.form.altInterestMethodE30360Compound') },
              { value: 'ACT_360_COMPOUND', label: t('new.form.altInterestMethodAct360Compound') },
              { value: 'ACT_ACT_COMPOUND', label: t('new.form.altInterestMethodActActCompound') },
            ]}
          />

          <FormSelect
            form={form}
            name="contractStatus"
            label={t('new.form.contractStatus')}
            placeholder={t('new.form.contractStatusPlaceholder')}
            options={[
              { value: 'PENDING', label: t('new.form.contractStatusPending') },
              { value: 'COMPLETED', label: t('new.form.contractStatusCompleted') },
            ]}
          />
        </div>
      </div>
    </>
  )
} 