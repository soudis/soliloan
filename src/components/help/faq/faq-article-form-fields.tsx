'use client';

import { useFormContext } from 'react-hook-form';

import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';
import { FormSwitch } from '@/components/form/form-switch';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import type { FaqArticleFormData } from '@/lib/schemas/faq';
import type { FaqTocArticle, FaqTocCategory } from '@/types/faq';

import { FaqRichTextEditor } from './faq-rich-text-editor';

type FaqArticleFormFieldsProps = {
  categories: Pick<FaqTocCategory, 'id' | 'name'>[];
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  labels: {
    title: string;
    titlePlaceholder: string;
    slug: string;
    slugPlaceholder: string;
    category: string;
    categoryPlaceholder: string;
    published: string;
    publishedHint: string;
    body: string;
  };
};

export function FaqArticleFormFields({ categories, pickerArticles, labels }: FaqArticleFormFieldsProps) {
  const form = useFormContext<FaqArticleFormData>();

  return (
    <div className="space-y-6">
      <FormField name="title" label={labels.title} placeholder={labels.titlePlaceholder} />
      <FormField name="slug" label={labels.slug} placeholder={labels.slugPlaceholder} />
      <FormSelect
        name="categoryId"
        label={labels.category}
        placeholder={labels.categoryPlaceholder}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
      />
      <FormSwitch name="published" label={labels.published} hint={labels.publishedHint} labelPlacement="inline" />
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
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
