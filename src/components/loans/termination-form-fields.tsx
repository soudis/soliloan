'use client';

import { DurationType } from '@prisma/client';
import { Calendar1, CalendarDays, MessageSquareX } from 'lucide-react';
import moment from 'moment';
import { useLocale, useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatDate } from '@/lib/utils';
import { FormDatePicker } from '../form/form-date-picker';
import { FormNumberWithSelect } from '../form/form-number-with-select';

type TranslateFn = (key: string) => string;

const getDurationOptions = (t: TranslateFn) =>
  Object.keys(DurationType).map((key) => ({
    value: key,
    label: t(`enums.loan.durationUnit.${key}`),
  }));

const calculateEndDate = (signDate: unknown, duration: unknown, durationType: unknown) => {
  if (!signDate || !duration || !durationType) return null;

  const signMoment = moment(signDate instanceof Date ? signDate : (signDate as string));
  if (!signMoment.isValid()) return null;

  const calculated = signMoment.add(Number(duration), durationType === 'MONTHS' ? 'months' : 'years');
  return calculated.isValid() ? calculated.toDate() : null;
};

type Props = {
  hideTerminationDate?: boolean;
};

export const TerminationFormFields = ({ hideTerminationDate }: Props) => {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();

  const { watch, setValue } = useFormContext();
  const terminationType = watch('terminationType') as string;

  const isFixedTerm = terminationType === 'ENDDATE' || terminationType === 'DURATION';
  const dateSubType = terminationType === 'DURATION' ? 'duration' : 'endDate';

  const signDate = watch('signDate');
  const duration = watch('duration');
  const durationType = watch('durationType');

  const calculatedEndDate = calculateEndDate(signDate, duration, durationType);
  const disabledFieldClasses = 'pointer-events-none opacity-50';

  const toggleValue = isFixedTerm ? 'fixedTerm' : 'cancellation';

  const handleToggleChange = (value: string) => {
    // ToggleGroup (single) may emit '' when the active item is clicked again.
    // We ignore that to keep a selection at all times.
    if (!value) return;

    if (value === 'cancellation') {
      setValue('terminationType', 'TERMINATION', { shouldDirty: true, shouldValidate: true });
      return;
    }

    setValue('terminationType', terminationType === 'DURATION' ? 'DURATION' : 'ENDDATE', {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRadioChange = (value: string) => {
    setValue('terminationType', value === 'duration' ? 'DURATION' : 'ENDDATE', {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <>
      <div className="mb-5 space-y-2">
        <Label className="block">{t('new.form.contractEnd')}</Label>
        <ToggleGroup type="single" value={toggleValue} onValueChange={handleToggleChange} className="w-full">
          <ToggleGroupItem value="cancellation" aria-label={t('new.form.contractEndByCancellation')}>
            <span className="inline-flex items-center justify-center gap-2">
              <MessageSquareX className="h-4 w-4" aria-hidden="true" />
              <span>{t('new.form.contractEndByCancellation')}</span>
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="fixedTerm" aria-label={t('new.form.contractEndByDate')}>
            <span className="inline-flex items-center justify-center gap-2">
              <Calendar1 className="h-4 w-4" aria-hidden="true" />
              <span>{t('new.form.contractEndByDate')}</span>
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2 max-w-80">
          {!isFixedTerm && (
            <div className="pl-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="block">{`${t('new.form.terminationPeriod')} *`}</Label>
                  <div className="w-full">
                    <FormNumberWithSelect
                      numberName="terminationPeriod"
                      selectName="terminationPeriodType"
                      numberPlaceholder={commonT('ui.form.enterPlaceholder')}
                      selectPlaceholder={commonT('ui.form.selectPlaceholder')}
                      numberMin={1}
                      selectOptions={getDurationOptions(commonT)}
                      className="!space-y-0"
                    />
                  </div>
                </div>

                {!hideTerminationDate && (
                  <div className="space-y-2">
                    <Label className="block">{t('new.form.terminationDate')}</Label>
                    <div className="w-44">
                      <FormDatePicker name="terminationDate" placeholder={commonT('ui.form.enterPlaceholder')} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {isFixedTerm && (
            <RadioGroup value={dateSubType} onValueChange={handleRadioChange} className="pl-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 h-4">
                  <RadioGroupItem value="endDate" id="radio-endDate" />
                  <Label htmlFor="radio-endDate" className="cursor-pointer whitespace-nowrap">
                    {t('new.form.contractEndAtDate')}
                    {dateSubType === 'endDate' ? ' *' : ''}
                  </Label>
                </div>
                <div className={cn('w-full', dateSubType !== 'endDate' && disabledFieldClasses)}>
                  <FormDatePicker name="endDate" placeholder={commonT('ui.form.enterPlaceholder')} />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 h-4">
                  <RadioGroupItem value="duration" id="radio-duration" />
                  <Label htmlFor="radio-duration" className="cursor-pointer whitespace-nowrap">
                    {t('new.form.contractEndAfterDuration')}
                    {dateSubType === 'duration' ? ' *' : ''}
                  </Label>
                </div>
                <div>
                  <div className={cn('', dateSubType !== 'duration' && disabledFieldClasses)}>
                    <FormNumberWithSelect
                      numberName="duration"
                      selectName="durationType"
                      selectPlaceholder={commonT('ui.form.selectPlaceholder')}
                      numberMin={1}
                      selectOptions={getDurationOptions(commonT)}
                    />
                  </div>
                  <div className="mt-0.5 pl-2">
                    {calculatedEndDate && dateSubType === 'duration' && (
                      <p className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {t('new.form.contractEndCalculated', {
                            date: formatDate(calculatedEndDate, locale),
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>
          )}
        </div>
      </div>
    </>
  );
};
