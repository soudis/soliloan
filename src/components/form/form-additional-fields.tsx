'use client';

import { useTranslations } from 'next-intl';

import { type AdditionalFieldConfig, AdditionalFieldType } from '@/lib/schemas/common';

import { FormDatePicker } from './form-date-picker';
import { FormField } from './form-field';
import { FormNumberInput } from './form-number-input';
import { FormSelect } from './form-select';
import { FormSwitch } from './form-switch';

interface FormAdditionalFieldsProps {
  config?: AdditionalFieldConfig[];
  name: string;
}

export function FormAdditionalFields({ config, name }: FormAdditionalFieldsProps) {
  const t = useTranslations('common.ui.additionalFields');

  if (!config || config.length === 0) {
    return null;
  }

  return (
    <>
      {config.map((fieldConfig) => {
        const fieldName = `${name}.${fieldConfig.name}`;
        const isRequired = fieldConfig.required;
        const label = isRequired ? `${fieldConfig.name} *` : fieldConfig.name;

        switch (fieldConfig.type) {
          case AdditionalFieldType.TEXT:
            return (
              <FormField
                key={fieldConfig.id}
                name={fieldName}
                label={label}
                placeholder={t('enterValue')}
                required={isRequired}
              />
            );
          case AdditionalFieldType.NUMBER:
            return (
              <FormNumberInput
                key={fieldConfig.id}
                name={fieldName}
                label={label}
                placeholder={t('enterValue')}
                minimumFractionDigits={fieldConfig.numberFormat === 'integer' ? 0 : 2}
                maximumFractionDigits={fieldConfig.numberFormat === 'integer' ? 0 : 2}
                prefix={
                  fieldConfig.numberFormat === 'money' ? '€' : fieldConfig.numberFormat === 'percent' ? '%' : undefined
                }
              />
            );
          case AdditionalFieldType.DATE:
            return <FormDatePicker key={fieldConfig.id} name={fieldName} label={label} placeholder={t('selectDate')} />;
          case AdditionalFieldType.SELECT:
            return (
              <FormSelect
                key={fieldConfig.id}
                name={fieldName}
                label={label}
                placeholder={t('selectOption')}
                options={fieldConfig.selectOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                clearable={!isRequired}
                required={isRequired}
              />
            );
          case AdditionalFieldType.BOOLEAN:
            return <FormSwitch key={fieldConfig.id} name={fieldName} label={label} />;
          default:
            return null;
        }
      })}
    </>
  );
}
