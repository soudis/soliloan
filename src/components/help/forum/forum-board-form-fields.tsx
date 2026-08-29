'use client';

import { useFormContext } from 'react-hook-form';

import { FormField } from '@/components/form/form-field';
import { FormMultiSelect } from '@/components/form/form-multi-select';
import type { ForumBoardFormData } from '@/lib/schemas/forum';
import type { ForumManagerOption } from '@/types/forum';

type ForumBoardFormFieldsProps = {
  managers: ForumManagerOption[];
  labels: {
    name: string;
    namePlaceholder: string;
    slug: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    moderators: string;
    moderatorsPlaceholder: string;
  };
};

export function ForumBoardFormFields({ managers, labels }: ForumBoardFormFieldsProps) {
  useFormContext<ForumBoardFormData>();

  return (
    <div className="space-y-3">
      <FormField name="name" label={labels.name} placeholder={labels.namePlaceholder} />
      <FormField name="slug" label={labels.slug} />
      <FormField
        name="description"
        label={labels.descriptionLabel}
        placeholder={labels.descriptionPlaceholder}
        multiline
      />
      <FormMultiSelect
        name="moderatorIds"
        label={labels.moderators}
        placeholder={labels.moderatorsPlaceholder}
        options={managers.map((manager) => ({
          value: manager.id,
          label: manager.email ? `${manager.name} (${manager.email})` : manager.name,
        }))}
      />
    </div>
  );
}
