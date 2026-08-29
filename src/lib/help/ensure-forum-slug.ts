import { FORUM_RESERVED_SLUGS } from '@/lib/help/forum-constants';
import { slugify } from '@/lib/help/slugify';
import { db } from '@/lib/db';

export function normalizeForumSlug(input: string): string {
  return slugify(input);
}

export async function assertUniqueForumBoardSlug(slug: string, excludeId?: string): Promise<string> {
  if (!slug) {
    throw new Error('validation.common.required');
  }
  if (FORUM_RESERVED_SLUGS.has(slug)) {
    throw new Error('error.forum.slugReserved');
  }

  const existing = await db.forumBoard.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new Error('error.forum.slugTaken');
  }
  return slug;
}
