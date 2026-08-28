import type { JSONContent } from '@tiptap/core';
import { db } from '@/lib/db';
import { extractFaqMediaIds, sanitizeFaqBody } from '@/lib/help/faq-body';

export async function deleteUnusedFaqMedia(candidateIds: string[]) {
  const uniqueIds = [...new Set(candidateIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const articles = await db.faqArticle.findMany({
    select: { body: true },
  });
  const used = new Set(articles.flatMap((article) => extractFaqMediaIds(sanitizeFaqBody(article.body as JSONContent))));
  const toDelete = uniqueIds.filter((id) => !used.has(id));
  if (toDelete.length === 0) return;

  await db.media.deleteMany({
    where: { id: { in: toDelete } },
  });
}
