'use client';

import { LimitationType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { FormField } from '@/components/form/form-field';
import { FormNumberInput } from '@/components/form/form-number-input';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormMessage } from '@/components/ui/form';
import { FormSection } from '@/components/ui/form-section';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import { cn, formatCurrency } from '@/lib/utils';
import { NotMoreThanNUnitsCapacityIndicator } from './not-more-than-n-units-capacity-indicator';
import { TotalAmountCapacityIndicator } from './total-amount-capacity-indicator';

interface Props {
  isInterestRateDisabled: boolean;
  showInterestRateDisabledHint?: boolean;
  /** Nur Anlage: Fokus auf Zinssatz, sofern das Feld nicht deaktiviert ist (z. B. fixer Zinssatz). */
  interestRateAutoFocus?: boolean;
  currentCapacityAmount: number | null;
  currentCapacityUnits: number | null;
}

export function InvestmentTypeFormFields({
  isInterestRateDisabled,
  showInterestRateDisabledHint = false,
  interestRateAutoFocus = false,
  currentCapacityAmount,
  currentCapacityUnits,
}: Props) {
  const t = useTranslations('dashboard.investmentTypes.form');
  const form = useFormContext();

  const sectionCardStretchClass = 'flex h-full min-h-0 flex-col';
  const sectionContentStretchClass = 'flex min-h-0 flex-1 flex-col';
  const sectionInnerStretchClass = 'flex h-full min-h-0 flex-1 flex-col';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-h-0 min-w-0 flex-col">
        <FormSection
          title={t('generalInfo')}
          className={sectionCardStretchClass}
          contentClassName={sectionContentStretchClass}
          innerClassName={sectionInnerStretchClass}
        >
          <FormNumberInput
            name="interestRate"
            label={`${t('interestRate')} *`}
            placeholder={t('interestRatePlaceholder')}
            prefix="%"
            minimumFractionDigits={0}
            maximumFractionDigits={3}
            min={0}
            step={0.01}
            disabled={isInterestRateDisabled}
            autoFocus={interestRateAutoFocus && !isInterestRateDisabled}
          />
          {showInterestRateDisabledHint && <p className="text-xs text-muted-foreground">{t('interestRateHintDisabled')}</p>}
          <FormField name="name" label={t('name')} placeholder={t('namePlaceholder')} />
        </FormSection>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <FormFieldWrapper
          control={form.control}
          name="limitationType"
          render={({ field }) => (
            <FormItem className="flex h-full min-h-0 flex-1 flex-col space-y-0">
              <FormControl>
                <RadioGroup
                  className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 p-0 sm:grid-cols-2"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                >
                  <label
                    htmlFor="limitation-type-total-amount"
                    className={cn(
                      'flex h-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                      field.value === LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <RadioGroupItem
                      value={LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD}
                      id="limitation-type-total-amount"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-12">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-tight">
                          {t('limitationTypeTotalAmount', {
                            limit: formatCurrency(MAX_TOTAL_AMOUNT_EUR),
                            timePeriod: `${PERIOD_MONTHS} Monate`,
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('limitationTypeTotalAmountDescription', {
                            limit: formatCurrency(MAX_TOTAL_AMOUNT_EUR),
                            timePeriod: `${PERIOD_MONTHS} Monaten`,
                          })}
                        </p>
                      </div>
                      <div className="flex w-full min-w-0 justify-center sm:justify-start">
                        <TotalAmountCapacityIndicator currentAmount={currentCapacityAmount} />
                      </div>
                    </div>
                  </label>
                  <label
                    htmlFor="limitation-type-not-more-than-n-units"
                    className={cn(
                      'flex h-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                      field.value === LimitationType.NOT_MORE_THAN_N_UNITS
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <RadioGroupItem
                      value={LimitationType.NOT_MORE_THAN_N_UNITS}
                      id="limitation-type-not-more-than-n-units"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-12">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-tight">
                          {t('limitationTypeNotMoreThanNUnits', { limit: MAX_UNITS })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('limitationTypeNotMoreThanNUnitsDescription', { limit: MAX_UNITS })}
                        </p>
                      </div>
                      <div className="flex w-full min-w-0 justify-center sm:justify-start">
                        <NotMoreThanNUnitsCapacityIndicator currentUnits={currentCapacityUnits} />
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
