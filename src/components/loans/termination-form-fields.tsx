import type { LoanTerminationData } from '@/lib/schemas/loan';
import { DurationType, TerminationType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { FormDatePicker } from '../form/form-date-picker';
import { FormNumberWithSelect } from '../form/form-number-with-select';
import { FormSelect } from '../form/form-select';

type Prosp = {
  hideTerminationDate?: boolean;
};

export const TerminationFormFields = ({ hideTerminationDate }: Prosp) => {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');

  const { watch } = useFormContext<LoanTerminationData>();
  const terminationType = watch('terminationType');
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          name="terminationType"
          label={`${t('new.form.terminationType')} *`}
          placeholder={commonT('ui.form.selectPlaceholder')}
          options={Object.keys(TerminationType).map((key) => ({
            value: key,
            label: commonT(`enums.loan.terminationType.${key}`),
          }))}
        />
      </div>
      {terminationType === 'ENDDATE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormDatePicker
            name="endDate"
            label={`${t('new.form.endDate')} *`}
            placeholder={commonT('ui.form.enterPlaceholder')}
          />
        </div>
      )}
      {terminationType === 'TERMINATION' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormNumberWithSelect
              numberName="terminationPeriod"
              selectName="terminationPeriodType"
              numberLabel={`${t('new.form.terminationPeriod')} *`}
              numberPlaceholder={commonT('ui.form.enterPlaceholder')}
              selectPlaceholder={commonT('ui.form.selectPlaceholder')}
              numberMin={1}
              selectOptions={Object.keys(DurationType).map((key) => ({
                value: key,
                label: commonT(`enums.loan.durationUnit.${key}`),
              }))}
            />
          </div>

          {!hideTerminationDate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormDatePicker
                name="terminationDate"
                label={t('new.form.terminationDate')}
                placeholder={commonT('ui.form.enterPlaceholder')}
              />
            </div>
          )}
        </div>
      )}
      {terminationType === 'DURATION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormNumberWithSelect
            numberName="duration"
            selectName="durationType"
            numberLabel={`${t('new.form.duration')} *`}
            numberPlaceholder={commonT('ui.form.enterPlaceholder')}
            selectPlaceholder={commonT('ui.form.selectPlaceholder')}
            numberMin={1}
            selectOptions={Object.keys(DurationType).map((key) => ({
              value: key,
              label: commonT(`enums.loan.durationUnit.${key}`),
            }))}
          />
        </div>
      )}
    </>
  );
};
