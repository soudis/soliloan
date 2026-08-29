export const FORUM_RESERVED_SLUGS = new Set(['new']);

export const FORUM_PAGE_SIZE = 20;

export const FORUM_MAX_DEPTH = 2;

export const FORUM_EMOJIS = ['👍', '❤️', '😄', '🎉', '👀', '👎'] as const;

export type ForumEmoji = (typeof FORUM_EMOJIS)[number];

export function isForumEmoji(value: string): value is ForumEmoji {
  return (FORUM_EMOJIS as readonly string[]).includes(value);
}
