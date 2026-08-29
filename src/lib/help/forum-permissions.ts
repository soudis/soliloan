export type ForumSessionUser = {
  id: string;
  isAdmin?: boolean | null;
};

export function forumUserFromSession(user: { id?: string | null; isAdmin?: boolean | null }): ForumSessionUser {
  if (!user.id) {
    throw new Error('error.unauthorized');
  }
  return { id: user.id, isAdmin: user.isAdmin };
}

export function canModerateBoard(user: ForumSessionUser, moderatorUserIds: string[]): boolean {
  if (user.isAdmin) return true;
  return moderatorUserIds.includes(user.id);
}

export function canRenameThread(user: ForumSessionUser, authorId: string, moderatorUserIds: string[]): boolean {
  return user.id === authorId || canModerateBoard(user, moderatorUserIds);
}

export function canDeleteThread(
  user: ForumSessionUser,
  authorId: string,
  replyCount: number,
  moderatorUserIds: string[],
): boolean {
  if (canModerateBoard(user, moderatorUserIds)) return true;
  return user.id === authorId && replyCount === 0;
}

export function canDeletePost(
  user: ForumSessionUser,
  authorId: string,
  hasReplies: boolean,
  moderatorUserIds: string[],
): boolean {
  if (hasReplies) return false;
  if (user.id === authorId) return true;
  return canModerateBoard(user, moderatorUserIds);
}

export function canEditPost(user: ForumSessionUser, authorId: string): boolean {
  return user.id === authorId;
}
