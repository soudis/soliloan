'use client';

import { PlusCircle, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormControl, FormField as FormFieldWrapper, FormItem } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type AdditionalFieldConfig, AdditionalFieldType, AdditionalNumberFormat } from '@/lib/schemas/common';
import { useTranslations } from 'next-intl';
import { FormCheckbox } from './form-checkbox';
import { FormChipInput } from './form-chip-input';
import { FormField } from './form-field';
import { FormSelect } from './form-select';

interface FormFieldConfiguratorProps {
  name: string;
}

export function FormFieldConfigurator({ name }: FormFieldConfiguratorProps) {
  const form = useFormContext<{ [key: string]: AdditionalFieldConfig[] }>();
  const t = useTranslations('common.ui.additionalFields');
  const { watch } = form;
  // Use useFieldArray to manage the fields
  const { fields, append, remove, update } = useFieldArray({
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
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">{t('fieldName')}</TableHead>
                    <TableHead className="w-[150px]">{t('fieldType')}</TableHead>
                    <TableHead>{t('options')}</TableHead>
                    <TableHead className="w-[100px]">{t('required')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length > 0 ? (
                    fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="align-top">
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
                          {watch(`${name}.${index}.type`) === AdditionalFieldType.NUMBER && (
                            <FormSelect
                              name={`${name}.${index}.numberFormat`}
                              placeholder={t('numberFormat')}
                              options={numberFormatOptions}
                            />
                          )}
                          {watch(`${name}.${index}.type`) === AdditionalFieldType.SELECT && (
                            <FormChipInput
                              name={`${name}.${index}.selectOptions`}
                              placeholder={t('addOptionPlaceholder')}
                              noItems={t('noOptionsDefined')}
                            />
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-6">
                          <FormCheckbox name={`${name}.${index}.required`} className="justify-center" />
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
