'use server';

import { db } from '@/lib/db';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { faqReorderSchema } from '@/lib/schemas/faq';
import { adminAction } from '@/lib/utils/safe-action';

export const reorderFaqAction = adminAction.inputSchema(faqReorderSchema).action(async ({ parsedInput }) => {
  await db.$transaction([
    ...parsedInput.categoryIds.map((id, position) =>
      db.faqCategory.update({
        where: { id },
        data: { position },
      }),
    ),
    ...parsedInput.groups.flatMap((group) =>
      group.articleIds.map((id, position) =>
        db.faqArticle.update({
          where: { id },
          data: { position, categoryId: group.categoryId },
        }),
      ),
    ),
  ]);

  revalidateFaqPaths();
  return { success: true };
});
