export type ForumManagerOption = {
  id: string;
  name: string;
  email: string | null;
};

export type ForumAuthor = {
  id: string;
  name: string;
};

export type ForumBoardListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  position: number;
  threadCount: number;
  unreadCount: number;
  lastPostedAt: Date | null;
  lastThreadTitle: string | null;
  moderatorNames: string[];
  moderatorIds: string[];
};

export type ForumBoardRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  position: number;
  moderatorIds: string[];
  moderators: ForumAuthor[];
};

export type ForumThreadListItem = {
  id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  lastPostedAt: Date;
  unread: boolean;
  author: ForumAuthor;
};

export type ForumPostReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean;
  names: string[];
};

export type ForumPostNode = {
  id: string;
  author: ForumAuthor;
  body: unknown;
  createdAt: Date;
  editedAt: Date | null;
  parentId: string | null;
  hasReplies: boolean;
  canEdit: boolean;
  canDelete: boolean;
  reactions: ForumPostReactionSummary[];
  replies: ForumPostNode[];
};

export type ForumThreadRecord = {
  id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  board: Pick<ForumBoardRecord, 'id' | 'name' | 'slug'>;
  author: ForumAuthor;
  canModerate: boolean;
  canRename: boolean;
  canDelete: boolean;
  originalPost: ForumPostNode | null;
  firstLevelPosts: ForumPostNode[];
  firstLevelTotal: number;
  page: number;
  pageSize: number;
};
