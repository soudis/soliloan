'use client';

import { useFormContext } from 'react-hook-form';

import { FaqRichTextEditor } from '@/components/help/faq/faq-rich-text-editor';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import type { ForumPostFormData } from '@/lib/schemas/forum';
import type { FaqTocArticle } from '@/types/faq';

type ForumPostFormFieldsProps = {
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  label: string;
  compact?: boolean;
};

export function ForumPostFormFields({ pickerArticles, label, compact = false }: ForumPostFormFieldsProps) {
  const form = useFormContext<Pick<ForumPostFormData, 'body'>>();

  return (
    <FormFieldWrapper
      control={form.control}
      name="body"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <FaqRichTextEditor
              value={field.value ?? EMPTY_FAQ_DOC}
              onChange={field.onChange}
              pickerArticles={pickerArticles}
              headings={false}
              editorClassName={
                compact
                  ? 'faq-tiptap-editor outline-none min-h-[8rem] px-3 py-2'
                  : 'faq-tiptap-editor outline-none min-h-[16rem] px-3 py-2'
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
