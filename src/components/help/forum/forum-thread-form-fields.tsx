'use client';

import { useFormContext } from 'react-hook-form';

import { FormField } from '@/components/form/form-field';
import { FaqRichTextEditor } from '@/components/help/faq/faq-rich-text-editor';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import type { ForumThreadFormData } from '@/lib/schemas/forum';
import type { FaqTocArticle } from '@/types/faq';

type ForumThreadFormFieldsProps = {
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  labels: {
    title: string;
    titlePlaceholder: string;
    body: string;
  };
};

export function ForumThreadFormFields({ pickerArticles, labels }: ForumThreadFormFieldsProps) {
  const form = useFormContext<ForumThreadFormData>();

  return (
    <div className="space-y-6">
      <FormField name="title" label={labels.title} placeholder={labels.titlePlaceholder} />
      <FormFieldWrapper
        control={form.control}
        name="body"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{labels.body}</FormLabel>
            <FormControl>
              <FaqRichTextEditor
                value={field.value ?? EMPTY_FAQ_DOC}
                onChange={field.onChange}
                pickerArticles={pickerArticles}
                headings={false}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
