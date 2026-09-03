'use client';

import { PlusCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField as FormFieldWrapper, FormItem } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type AdditionalFieldConfig, AdditionalFieldType, AdditionalNumberFormat } from '@/lib/schemas/common';
import { FormCheckbox } from './form-checkbox';
import { FormChipInput } from './form-chip-input';
import { FormDatePicker } from './form-date-picker';
import { FormField } from './form-field';
import { FormNumberInput } from './form-number-input';
import { FormSelect } from './form-select';

interface FormFieldConfiguratorProps {
  name: string;
}

function EnforceBooleanFieldConstraints({ name }: { name: string }) {
  const { setValue, getValues } = useFormContext();
  const type = useWatch({ name: `${name}.type` });

  useEffect(() => {
    if (type !== AdditionalFieldType.BOOLEAN) return;

    if (getValues(`${name}.required`) !== true) {
      setValue(`${name}.required`, true, { shouldDirty: false, shouldValidate: false });
    }

    const defaultValue = getValues(`${name}.defaultValue`);
    if (defaultValue !== true && defaultValue !== 'true' && defaultValue !== false && defaultValue !== 'false') {
      setValue(`${name}.defaultValue`, 'false', { shouldDirty: false, shouldValidate: false });
    }
  }, [type, name, getValues, setValue]);

  return null;
}

export function FormFieldConfigurator({ name }: FormFieldConfiguratorProps) {
  const form = useFormContext<{ [key: string]: AdditionalFieldConfig[] }>();
  const t = useTranslations('common.ui.additionalFields');
  const { watch } = form;
  // Use useFieldArray to manage the fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  // Generate a unique ID for new fields
  const generateId = () => `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const addField = () => {
    const newField: AdditionalFieldConfig = {
      id: generateId(),
      name: '',
      type: AdditionalFieldType.TEXT,
      selectOptions: [],
      required: false,
    };
    append(newField);
  };

  const typeOptions = [
    { value: AdditionalFieldType.TEXT, label: t('text') },
    { value: AdditionalFieldType.NUMBER, label: t('number') },
    { value: AdditionalFieldType.DATE, label: t('date') },
    { value: AdditionalFieldType.SELECT, label: t('select') },
    { value: AdditionalFieldType.BOOLEAN, label: t('boolean') },
  ];

  const numberFormatOptions = [
    { value: AdditionalNumberFormat.INTEGER, label: t('integer') },
    { value: AdditionalNumberFormat.MONEY, label: t('money') },
    { value: AdditionalNumberFormat.PERCENT, label: t('percent') },
  ];

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={() => (
        <FormItem className="space-y-3">
          <FormControl>
            <div
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">{t('fieldName')}</TableHead>
                    <TableHead className="w-[200px]">{t('fieldType')}</TableHead>
                    <TableHead>{t('options')}</TableHead>
                    <TableHead className="w-[250px]">{t('defaultValue')}</TableHead>
                    <TableHead className="w-[100px]">{t('required')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length > 0 ? (
                    fields.map((field, index) => {
                      const fieldType = watch(`${name}.${index}.type`);
                      const isBoolean = fieldType === AdditionalFieldType.BOOLEAN;

                      return (
                      <TableRow key={field.id}>
                        <TableCell className="align-top">
                          <EnforceBooleanFieldConstraints name={`${name}.${index}`} />
                          <FormField
                            name={`${name}.${index}.name`}
                            placeholder={t('fieldNamePlaceholder')}
                            required={false}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <FormSelect
                            name={`${name}.${index}.type`}
                            placeholder={t('fieldType')}
                            options={typeOptions}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          {fieldType === AdditionalFieldType.NUMBER && (
                            <FormSelect
                              name={`${name}.${index}.numberFormat`}
                              placeholder={t('numberFormat')}
                              options={numberFormatOptions}
                            />
                          )}
                          {fieldType === AdditionalFieldType.SELECT && (
                            <FormChipInput
                              name={`${name}.${index}.selectOptions`}
                              placeholder={t('addOptionPlaceholder')}
                              noItems={t('noOptionsDefined')}
                            />
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {isBoolean && (
                            <div className="flex h-10 items-center justify-center">
                              <FormCheckbox name={`${name}.${index}.defaultValue`} className="justify-center" />
                            </div>
                          )}
                          {fieldType === AdditionalFieldType.SELECT && (
                            <FormSelect
                              name={`${name}.${index}.defaultValue`}
                              placeholder={t('selectOption')}
                              options={watch(`${name}.${index}.selectOptions`).map((option) => ({
                                value: option,
                                label: option,
                              }))}
                              clearable={true}
                              required={false}
                            />
                          )}
                          {fieldType === AdditionalFieldType.DATE && (
                            <FormDatePicker name={`${name}.${index}.defaultValue`} placeholder={t('selectDate')} />
                          )}
                          {fieldType === AdditionalFieldType.NUMBER && (
                            <FormNumberInput
                              name={`${name}.${index}.defaultValue`}
                              placeholder={t('enterValue')}
                              minimumFractionDigits={watch(`${name}.${index}.numberFormat`) === 'integer' ? 0 : 2}
                              maximumFractionDigits={watch(`${name}.${index}.numberFormat`) === 'integer' ? 0 : 2}
                              prefix={
                                watch(`${name}.${index}.numberFormat`) === 'money'
                                  ? '€'
                                  : watch(`${name}.${index}.numberFormat`) === 'percent'
                                    ? '%'
                                    : undefined
                              }
                            />
                          )}
                          {fieldType === AdditionalFieldType.TEXT && (
                            <FormField name={`${name}.${index}.defaultValue`} placeholder={t('enterValue')} />
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex h-10 items-center justify-center">
                            <FormCheckbox
                              name={`${name}.${index}.required`}
                              className="justify-center"
                              disabled={isBoolean}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        {t('noFieldsDefined')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button type="button" variant="outline" onClick={addField} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addField')}
              </Button>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
