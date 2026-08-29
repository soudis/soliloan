'use client';

import { Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { toggleForumReactionAction } from '@/actions/help';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { FORUM_EMOJIS, type ForumEmoji } from '@/lib/help/forum-constants';
import { cn } from '@/lib/utils';
import type { ForumPostReactionSummary } from '@/types/forum';

type ForumReactionsProps = {
  postId: string;
  reactions: ForumPostReactionSummary[];
};

export function ForumReactions({ postId, reactions }: ForumReactionsProps) {
  const t = useTranslations('help.forumPage');
  const router = useRouter();
  const { executeAsync, isExecuting } = useAction(toggleForumReactionAction);
  const byEmoji = new Map(reactions.map((item) => [item.emoji, item]));
  const used = FORUM_EMOJIS.filter((emoji) => (byEmoji.get(emoji)?.count ?? 0) > 0);

  const toggle = async (emoji: ForumEmoji) => {
    const result = await executeAsync({ postId, emoji });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <TooltipProvider delayDuration={300}>
        {used.map((emoji) => {
          const item = byEmoji.get(emoji);
          const count = item?.count ?? 0;
          const reacted = item?.reacted ?? false;
          const names = item?.names ?? [];
          const button = (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 bg-transparent px-2 text-sm hover:bg-transparent',
                !reacted && 'text-muted-foreground',
              )}
              disabled={isExecuting}
              onClick={() => void toggle(emoji)}
            >
              <span aria-hidden>{emoji}</span>
              <span className="ml-1 tabular-nums">{count}</span>
            </Button>
          );
          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                {isExecuting ? <span className="inline-flex">{button}</span> : button}
              </TooltipTrigger>
              <TooltipContent>{names.join(', ')}</TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={isExecuting}
                >
                  <Smile className="h-4 w-4" />
                  <span className="sr-only">{t('react')}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('react')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end" className="flex min-w-0 flex-row gap-0.5 p-1">
          {FORUM_EMOJIS.map((emoji) => (
            <DropdownMenuItem
              key={emoji}
              className="cursor-pointer justify-center bg-transparent px-2 focus:bg-accent"
              disabled={isExecuting}
              onSelect={() => void toggle(emoji)}
            >
              <span aria-hidden className="text-base">
                {emoji}
              </span>
              <span className="sr-only">{emoji}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
