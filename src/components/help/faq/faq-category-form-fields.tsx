'use client';

import { FormField } from '@/components/form/form-field';

type FaqCategoryFormFieldsProps = {
  labels: {
    name: string;
    namePlaceholder: string;
    slug: string;
  };
};

export function FaqCategoryFormFields({ labels }: FaqCategoryFormFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField name="name" label={labels.name} placeholder={labels.namePlaceholder} />
      <FormField name="slug" label={labels.slug} />
    </div>
  );
}
