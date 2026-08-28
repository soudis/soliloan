import { z } from 'zod';

import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { slugify } from '@/lib/help/slugify';

const requiredSlug = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return '';
    return slugify(value);
  },
  z
    .string()
    .min(1, { message: 'validation.common.required' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'validation.help.slugInvalid' }),
);

const requiredTitle = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
  },
  z.string().min(1, { message: 'validation.common.required' }).max(200, { message: 'validation.common.tooLong' }),
);

export const faqArticleFormSchema = z.object({
  title: requiredTitle,
  slug: requiredSlug,
  categoryId: z.preprocess(
    (value) => {
      if (value === '' || value === 'clear' || value == null) return '';
      return value;
    },
    z.string().min(1, { message: 'validation.common.required' }),
  ),
  published: z.boolean(),
  body: z.unknown().default(EMPTY_FAQ_DOC),
});

export type FaqArticleFormData = z.infer<typeof faqArticleFormSchema>;

export const faqCategoryFormSchema = z.object({
  name: requiredTitle,
  slug: requiredSlug,
});

export type FaqCategoryFormData = z.infer<typeof faqCategoryFormSchema>;

export const faqReorderSchema = z.object({
  categoryIds: z.array(z.string()),
  groups: z.array(
    z.object({
      categoryId: z.string().min(1),
      articleIds: z.array(z.string()),
    }),
  ),
});
