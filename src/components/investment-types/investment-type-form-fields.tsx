'use client';

import { LimitationType } from '@prisma/client';
import { Hash, Sigma } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { FormField } from '@/components/form/form-field';
import { FormNumberInput } from '@/components/form/form-number-input';
import { FormSection } from '@/components/ui/form-section';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';

interface Props {
  hasLoans: boolean;
}

export function InvestmentTypeFormFields({ hasLoans }: Props) {
  const t = useTranslations('dashboard.investmentTypes.form');
  const form = useFormContext();

  const currencyFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

  const cards = [
    {
      value: LimitationType.NOT_MORE_THAN_N_UNITS,
      icon: Hash,
      label: t('limitationTypeNotMoreThanNUnits', { limit: MAX_UNITS }),
      description: t('limitationTypeNotMoreThanNUnitsDescription', { limit: MAX_UNITS }),
    },
    {
      value: LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD,
      icon: Sigma,
      label: t('limitationTypeTotalAmount', {
        limit: currencyFormat.format(MAX_TOTAL_AMOUNT_EUR),
        timePeriod: `${PERIOD_MONTHS} Monate`,
      }),
      description: t('limitationTypeTotalAmountDescription', {
        limit: currencyFormat.format(MAX_TOTAL_AMOUNT_EUR),
        timePeriod: `${PERIOD_MONTHS} Monaten`,
      }),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <FormSection title={t('interestRate')}>
        <FormNumberInput
          name="interestRate"
          label={`${t('interestRate')} *`}
          placeholder={t('interestRatePlaceholder')}
          prefix="%"
          minimumFractionDigits={0}
          maximumFractionDigits={3}
          min={0}
          step={0.01}
          disabled={hasLoans}
          hint={hasLoans ? t('interestRateHintDisabled') : undefined}
        />
        <FormField
          name="name"
          label={t('name')}
          placeholder={t('namePlaceholder')}
        />
      </FormSection>

      <FormSection title={t('limitationType')}>
        <FormFieldWrapper
          control={form.control}
          name="limitationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('limitationType')} *</FormLabel>
              <FormControl>
                <div className="grid grid-cols-1 gap-3">
                  {cards.map((card) => {
                    const Icon = card.icon;
                    const isSelected = field.value === card.value;
                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => field.onChange(card.value)}
                        className={cn(
                          'flex items-start gap-4 rounded-lg border p-4 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50',
                        )}
                      >
                        <div className={cn(
                          'mt-0.5 rounded-md p-2',
                          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-tight">{card.label}</p>
                          <p className="text-xs text-muted-foreground">{card.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}
