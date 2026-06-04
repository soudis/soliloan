'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NoteRichTextEditor } from '@/components/generic/notes/note-rich-text-editor';
import type { NoteFormData } from '@/lib/schemas/note';
import type { LoanWithCalculations } from '@/types/loans';
import { LoanDropdown } from '../lenders/loan-dropdown';

type NoteFormFieldsProps = {
  loans?: LoanWithCalculations[];
  loanId?: string;
};

export function NoteFormFields({ loans, loanId }: NoteFormFieldsProps) {
  const t = useTranslations('dashboard.notes');
  const form = useFormContext<NoteFormData & { loanId?: string | null }>();

  return (
    <>
      {!loanId && loans && (
        <FormItem>
          <FormLabel>{t('loan')}</FormLabel>
          <LoanDropdown
            loans={loans}
            selectedLoanId={form.watch('loanId') ?? undefined}
            onSelectLoan={(value) => form.setValue('loanId', value)}
            simple
          />
        </FormItem>
      )}

      <FormFieldWrapper
        control={form.control}
        name="text"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('text')}</FormLabel>
            <FormControl>
              <NoteRichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('textPlaceholder')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormFieldWrapper
        control={form.control}
        name="public"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>{t('public')}</FormLabel>
              <p className="text-sm text-muted-foreground">{t('publicDescription')}</p>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
