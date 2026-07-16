'use client';

import { SavingsRateType } from '@prisma/client';
import { ChartColumn, Equal, Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  calculateSavingsDepositCountFromMonthlyAmount,
  calculateSavingsLastDepositDate,
  calculateSavingsMonthlyAmount,
  resolveSavingsFirstDepositDate,
} from '@/lib/loans/savings-contract';
import type { LoanFormClientData } from '@/lib/schemas/loan';
import { formatDateLong, formatNumber, NumberParser } from '@/lib/utils';

type SavingsFieldKey = 'savingsMonthlyAmount' | 'savingsDepositCount';
type FieldMode = 'defined' | 'derived';

const hasDateValue = (value: Date | '' | null | undefined): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());
const hasCountValue = (value: '' | number | null | undefined): value is number =>
  typeof value === 'number' && value >= 1;
const hasAmountValue = (value: string) => {
  const parser = new NumberParser('de-DE');
  const parsed = parser.parse(value);
  return parsed != null && parsed > 0;
};

const getInitialFieldModes = (
  values: LoanFormClientData,
  isFixedRate: boolean,
): Record<SavingsFieldKey, FieldMode | null> => ({
  savingsMonthlyAmount: isFixedRate && hasAmountValue(values.savingsMonthlyAmount) ? 'defined' : null,
  savingsDepositCount: hasCountValue(values.savingsDepositCount) ? 'defined' : null,
});

interface LockedFieldOverlayProps {
  isLocked: boolean;
  unlockLabel: string;
  onUnlock: () => void;
  children: ReactNode;
}

function LockedFieldOverlay({ isLocked, unlockLabel, onUnlock, children }: LockedFieldOverlayProps) {
  const handleUnlock = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onUnlock();
    },
    [onUnlock],
  );

  return (
    <div className="relative">
      {children}
      {isLocked && (
        <button
          type="button"
          aria-label={unlockLabel}
          className="absolute inset-0 z-10 cursor-pointer rounded-md bg-transparent"
          onClick={onUnlock}
          onKeyDown={handleUnlock}
        />
      )}
    </div>
  );
}

function SavingsFieldLabel({ label, isLocked }: { label: string; isLocked: boolean }) {
  return (
    <FormLabel className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </FormLabel>
  );
}

export function SavingsFormFields() {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { watch, setValue, control, getValues } = useFormContext<LoanFormClientData>();
  const hasInitializedModesRef = useRef(false);

  const isSavingsContract = watch('isSavingsContract');
  const savingsRateType = watch('savingsRateType');
  const signDate = watch('signDate');
  const amount = watch('amount');
  const savingsFirstDepositDate = watch('savingsFirstDepositDate');
  const savingsDepositCount = watch('savingsDepositCount');
  const isFixedRate = savingsRateType === SavingsRateType.FIXED;
  const toggleValue = isFixedRate ? 'fixed' : 'varying';

  const parser = new NumberParser('de-DE');
  const loanAmount = parser.parse(amount as string) ?? 0;
  const previousLoanAmountRef = useRef(loanAmount);

  const [fieldModes, setFieldModes] = useState<Record<SavingsFieldKey, FieldMode | null>>(() =>
    getInitialFieldModes(getValues(), isFixedRate),
  );
  const [firstDepositDatePickerOpen, setFirstDepositDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!isSavingsContract) {
      hasInitializedModesRef.current = false;
      return;
    }

    if (hasInitializedModesRef.current) return;

    hasInitializedModesRef.current = true;
    setFieldModes(getInitialFieldModes(getValues(), isFixedRate));
  }, [getValues, isFixedRate, isSavingsContract]);

  const setFieldMode = useCallback((field: SavingsFieldKey, mode: FieldMode | null) => {
    setFieldModes((current) => ({ ...current, [field]: mode }));
  }, []);

  const setDerivedValue = useCallback(
    (field: SavingsFieldKey, value: number | string | '' | null) => {
      setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
      if (value === '' || value === null) {
        setFieldMode(field, null);
        return;
      }
      setFieldMode(field, 'derived');
    },
    [setFieldMode, setValue],
  );

  const applyDependencyRules = useCallback(
    (changed: SavingsFieldKey | 'amount') => {
      const values = getValues();
      const depositCount = values.savingsDepositCount;
      const monthlyAmount = parser.parse(values.savingsMonthlyAmount as string);

      const hasDepositCount = hasCountValue(depositCount);
      const hasMonthlyAmount = monthlyAmount != null && monthlyAmount > 0;

      if (changed === 'savingsMonthlyAmount' && isFixedRate && loanAmount > 0 && hasMonthlyAmount) {
        const count = calculateSavingsDepositCountFromMonthlyAmount(loanAmount, monthlyAmount);
        if (count) setDerivedValue('savingsDepositCount', count);
        return;
      }

      if (changed === 'savingsDepositCount' && hasDepositCount && typeof depositCount === 'number') {
        if (isFixedRate && loanAmount > 0) {
          const monthly = calculateSavingsMonthlyAmount(loanAmount, depositCount);
          if (monthly != null) setDerivedValue('savingsMonthlyAmount', formatNumber(monthly));
        }
        return;
      }

      if (changed === 'amount') {
        if (!isFixedRate || loanAmount <= 0) return;

        if (fieldModes.savingsMonthlyAmount === 'defined' && hasMonthlyAmount) {
          const count = calculateSavingsDepositCountFromMonthlyAmount(loanAmount, monthlyAmount);
          if (count) setDerivedValue('savingsDepositCount', count);
          return;
        }

        if (fieldModes.savingsDepositCount === 'defined' && hasDepositCount && typeof depositCount === 'number') {
          const monthly = calculateSavingsMonthlyAmount(loanAmount, depositCount);
          if (monthly != null) setDerivedValue('savingsMonthlyAmount', formatNumber(monthly));
        }
      }
    },
    [fieldModes, getValues, isFixedRate, loanAmount, parser, setDerivedValue],
  );

  useEffect(() => {
    if (!isSavingsContract) {
      previousLoanAmountRef.current = loanAmount;
      return;
    }

    if (previousLoanAmountRef.current === loanAmount) return;
    previousLoanAmountRef.current = loanAmount;

    applyDependencyRules('amount');
  }, [applyDependencyRules, isSavingsContract, loanAmount]);

  useEffect(() => {
    if (!isSavingsContract) return;

    const effectiveFirst = resolveSavingsFirstDepositDate(
      hasDateValue(savingsFirstDepositDate) ? savingsFirstDepositDate : null,
      hasDateValue(signDate) ? signDate : null,
    );

    if (effectiveFirst && hasCountValue(savingsDepositCount)) {
      const last = calculateSavingsLastDepositDate(effectiveFirst, savingsDepositCount);
      setValue('savingsLastDepositDate', last ?? '', { shouldDirty: true, shouldValidate: true });
      return;
    }

    setValue('savingsLastDepositDate', '', { shouldDirty: true, shouldValidate: true });
  }, [isSavingsContract, savingsFirstDepositDate, savingsDepositCount, signDate, setValue]);

  const handleUserFieldChange = useCallback(
    (field: SavingsFieldKey, value: number | string | '' | null) => {
      setValue(field, value as never, { shouldDirty: true, shouldValidate: true });

      if (value === '' || value === null) {
        setFieldMode(field, null);
        return;
      }

      setFieldMode(field, 'defined');
      applyDependencyRules(field);
    },
    [applyDependencyRules, setFieldMode, setValue],
  );

  const handleFirstDepositDateChange = useCallback(
    (date: Date | '' | null) => {
      setValue('savingsFirstDepositDate', date ?? '', { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const handleUnlockField = useCallback(
    (field: SavingsFieldKey) => {
      if (fieldModes[field] !== 'derived') return;
      setFieldMode(field, 'defined');
      applyDependencyRules(field);
    },
    [applyDependencyRules, fieldModes, setFieldMode],
  );

  const isFieldLocked = useCallback(
    (field: SavingsFieldKey, hasValue: boolean) => fieldModes[field] === 'derived' && hasValue,
    [fieldModes],
  );

  const handleToggleChange = (value: string) => {
    if (!value) return;

    setValue('savingsRateType', value === 'fixed' ? SavingsRateType.FIXED : SavingsRateType.VARYING, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (value !== 'fixed') {
      setValue('savingsMonthlyAmount', '', { shouldDirty: true, shouldValidate: true });
      setFieldMode('savingsMonthlyAmount', null);
    }
  };

  const monthlyFormatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  const fieldUnlockLabel = t('new.form.savingsFieldUnlock');

  const calculatedLastDepositDate = (() => {
    const effectiveFirst = resolveSavingsFirstDepositDate(
      hasDateValue(savingsFirstDepositDate) ? savingsFirstDepositDate : null,
      hasDateValue(signDate) ? signDate : null,
    );
    if (!effectiveFirst || !hasCountValue(savingsDepositCount)) return null;
    return calculateSavingsLastDepositDate(effectiveFirst, savingsDepositCount);
  })();

  return (
    <>
      {isSavingsContract && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-400 motion-reduce:animate-none space-y-5">
          <div className="space-y-2">
            <Label className="block">{t('new.form.savingsRateType')}</Label>
            <ToggleGroup type="single" value={toggleValue} onValueChange={handleToggleChange} className="w-full">
              <ToggleGroupItem value="fixed" aria-label={t('new.form.savingsRateTypeFixed')}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Equal className="h-4 w-4" aria-hidden="true" />
                  <span>{t('new.form.savingsRateTypeFixed')}</span>
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value="varying" aria-label={t('new.form.savingsRateTypeVarying')}>
                <span className="inline-flex items-center justify-center gap-2">
                  <ChartColumn className="h-4 w-4" aria-hidden="true" />
                  <span>{t('new.form.savingsRateTypeVarying')}</span>
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isFixedRate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="savingsMonthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <SavingsFieldLabel
                      label={t('new.form.savingsMonthlyAmount')}
                      isLocked={isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))}
                    />
                    <FormControl>
                      <LockedFieldOverlay
                        isLocked={isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))}
                        unlockLabel={fieldUnlockLabel}
                        onUnlock={() => handleUnlockField('savingsMonthlyAmount')}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center">
                          <span className="text-gray-500 sm:text-sm border-r border-gray-300 py-1.5 min-w-10 text-center">
                            €
                          </span>
                        </div>
                        <Input
                          type="text"
                          placeholder={commonT('ui.form.enterPlaceholder')}
                          {...field}
                          value={field.value}
                          disabled={isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))}
                          aria-hidden={isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))}
                          onBlur={(event) => {
                            if (isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))) return;
                            const value = event.target.value;
                            if (!value) return;
                            const number = parser.parse(value) ?? 0;
                            handleUserFieldChange('savingsMonthlyAmount', monthlyFormatter.format(number));
                          }}
                          onChange={(event) => {
                            if (isFieldLocked('savingsMonthlyAmount', hasAmountValue(field.value))) return;
                            handleUserFieldChange('savingsMonthlyAmount', parser.strip(event.target.value));
                          }}
                          className="pl-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </LockedFieldOverlay>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="savingsDepositCount"
                render={({ field }) => (
                  <FormItem>
                    <SavingsFieldLabel
                      label={t('new.form.savingsDepositCountFixed')}
                      isLocked={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                    />
                    <FormControl>
                      <LockedFieldOverlay
                        isLocked={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                        unlockLabel={fieldUnlockLabel}
                        onUnlock={() => handleUnlockField('savingsDepositCount')}
                      >
                        <Input
                          type="number"
                          placeholder={commonT('ui.form.enterPlaceholder')}
                          min={1}
                          step={1}
                          {...field}
                          value={field.value ?? ''}
                          disabled={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                          aria-hidden={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                          onChange={(e) => {
                            if (isFieldLocked('savingsDepositCount', hasCountValue(field.value))) return;
                            const next = e.target.value;
                            handleUserFieldChange('savingsDepositCount', next === '' ? '' : Number.parseInt(next, 10));
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </LockedFieldOverlay>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <div className="max-w-80">
              <FormField
                control={control}
                name="savingsDepositCount"
                render={({ field }) => (
                  <FormItem>
                    <SavingsFieldLabel
                      label={t('new.form.savingsDepositCountVarying')}
                      isLocked={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                    />
                    <FormControl>
                      <LockedFieldOverlay
                        isLocked={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                        unlockLabel={fieldUnlockLabel}
                        onUnlock={() => handleUnlockField('savingsDepositCount')}
                      >
                        <Input
                          type="number"
                          placeholder={commonT('ui.form.enterPlaceholder')}
                          min={1}
                          step={1}
                          {...field}
                          value={field.value ?? ''}
                          disabled={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                          aria-hidden={isFieldLocked('savingsDepositCount', hasCountValue(field.value))}
                          onChange={(e) => {
                            if (isFieldLocked('savingsDepositCount', hasCountValue(field.value))) return;
                            const next = e.target.value;
                            handleUserFieldChange('savingsDepositCount', next === '' ? '' : Number.parseInt(next, 10));
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </LockedFieldOverlay>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="savingsFirstDepositDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('new.form.savingsFirstDepositDate')}</FormLabel>
                  <DatePickerInput
                    withFormControl
                    value={field.value}
                    onChange={(date) => handleFirstDepositDateChange(date ?? '')}
                    placeholder={commonT('ui.form.enterPlaceholder')}
                    open={firstDepositDatePickerOpen}
                    onOpenChange={setFirstDepositDatePickerOpen}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {calculatedLastDepositDate && (
              <div className="flex flex-col gap-2">
                <Label>{t('new.form.savingsLastDepositDate')}</Label>
                <p className="flex h-9 items-center text-sm">{formatDateLong(calculatedLastDepositDate, locale)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
