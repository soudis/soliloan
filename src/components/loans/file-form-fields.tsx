'use client'

import { FormField } from '@/components/form/form-field'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form'
import { FileFormData } from '@/lib/schemas/file'
import { useTranslations } from 'next-intl'
import { useFormContext } from 'react-hook-form'

export function FileFormFields() {
  const t = useTranslations('dashboard.files')
  const commonT = useTranslations('common')
  const form = useFormContext<FileFormData>()

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="file" className="text-sm font-medium">
          {t('file')}
        </label>
        <input
          id="file"
          type="file"
          className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Set the name field to the file name without extension
              const fileName = file.name.replace(/\.[^/.]+$/, "");
              form.setValue('name', fileName);
            }
          }}
        />
      </div>

      <FormField
        form={form}
        name="name"
        label={t('name')}
        placeholder={t('namePlaceholder')}
      />

      <FormField
        form={form}
        name="description"
        label={t('description')}
        placeholder={t('descriptionPlaceholder')}
        multiline={true}
      />

      <FormFieldWrapper
        control={form.control}
        name="public"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                {t('public')}
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                {t('publicDescription')}
              </p>
            </div>
          </FormItem>
        )}
      />
    </>
  )
} 