'use client';

import type { JSONContent } from '@tiptap/core';
import { CornerDownRight, Link2, Pencil, Reply, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteForumPostAction } from '@/actions/help';
import { FaqTiptapRenderer } from '@/components/help/faq/faq-tiptap-renderer';
import { ActionButton } from '@/components/ui/action-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { formatForumAbsoluteTime, formatForumRelativeTime } from '@/lib/help/forum-time';
import { cn } from '@/lib/utils';
import type { FaqTocArticle } from '@/types/faq';
import type { ForumPostNode } from '@/types/forum';

import { ForumPostForm } from './forum-post-form';
import { ForumReactions } from './forum-reactions';

type ForumPostProps = {
  post: ForumPostNode;
  threadId: string;
  boardSlug: string;
  locked: boolean;
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  depth?: number;
};

export function ForumPost({ post, threadId, boardSlug, locked, pickerArticles, depth = 0 }: ForumPostProps) {
  const t = useTranslations('help.forumPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { executeAsync: remove, isExecuting } = useAction(deleteForumPostAction);

  const copyPermalink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#post-${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t('permalinkCopied'));
  };

  const hasReplies = post.replies.length > 0;

  return (
    <div className={cn(depth > 0 && 'pl-6', hasReplies && 'border-b border-border/20')}>
      <article
        id={`post-${post.id}`}
        className={cn(
          'flex scroll-mt-24 gap-3 py-4',
          depth > 0 && 'border-t border-border/20',
          !hasReplies && depth === 0 && 'border-b border-border/20',
        )}
      >
        {depth > 0 ? <CornerDownRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        <ForumPostAvatar name={post.author.name} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm leading-none font-medium">{post.author.name}</span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="cursor-default border-0 bg-transparent p-0 text-xs leading-none text-muted-foreground"
                  >
                    <time dateTime={new Date(post.createdAt).toISOString()}>
                      {formatForumRelativeTime(post.createdAt)}
                      {post.editedAt ? ` · ${t('edited')}` : ''}
                    </time>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{formatForumAbsoluteTime(post.createdAt)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {editing ? (
            <ForumPostForm
              mode="edit"
              postId={post.id}
              initialBody={post.body}
              pickerArticles={pickerArticles}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <FaqTiptapRenderer content={post.body as JSONContent} headings={false} />
          )}

          <div className="flex flex-wrap items-center justify-end gap-1">
            <ForumReactions postId={post.id} reactions={post.reactions} />
            {!locked && !editing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setReplying((value) => !value)}
              >
                <Reply className="h-3.5 w-3.5" />
                {t('reply')}
              </Button>
            ) : null}
            {post.canEdit && !editing ? (
              <ActionButton
                icon={<Pencil className="h-3.5 w-3.5" />}
                tooltip={tUi('edit')}
                srOnly={tUi('edit')}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              />
            ) : null}
            {post.canDelete ? (
              <ActionButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
                tooltip={tUi('delete')}
                srOnly={tUi('delete')}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmDelete(true)}
              />
            ) : null}
            <ActionButton
              icon={<Link2 className="h-3.5 w-3.5" />}
              tooltip={t('permalink')}
              srOnly={t('permalink')}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => void copyPermalink()}
            />
          </div>

          {replying && !locked ? (
            <div className="pt-2">
              <p className="mb-2 text-sm text-muted-foreground">{t('replyTo', { name: post.author.name })}</p>
              <ForumPostForm
                mode="reply"
                threadId={threadId}
                parentId={post.id}
                pickerArticles={pickerArticles}
                onCancel={() => setReplying(false)}
              />
            </div>
          ) : null}
        </div>
      </article>

      {post.replies.map((reply) => (
        <ForumPost
          key={reply.id}
          post={reply}
          threadId={threadId}
          boardSlug={boardSlug}
          locked={locked}
          pickerArticles={pickerArticles}
          depth={depth + 1}
        />
      ))}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePostTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deletePostDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tUi('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isExecuting}
              onClick={async () => {
                const result = await remove({ id: post.id });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('deleted'));
                if (result?.data && 'deletedThread' in result.data && result.data.deletedThread) {
                  router.push(`/help/forum/${boardSlug}`);
                }
                router.refresh();
              }}
            >
              {tUi('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ForumPostAvatar({ name }: { name: string }) {
  const hue = authorHue(name);
  return (
    <div
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
      style={{
        backgroundColor: `oklch(0.93 0.05 ${hue})`,
        color: `oklch(0.38 0.08 ${hue})`,
      }}
    >
      {authorInitials(name)}
    </div>
  );
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function authorHue(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}
