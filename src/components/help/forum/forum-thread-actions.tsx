'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  deleteForumThreadAction,
  moveForumThreadAction,
  renameForumThreadAction,
  updateForumThreadFlagsAction,
} from '@/actions/help';
import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { forumThreadMoveSchema, forumThreadRenameSchema } from '@/lib/schemas/forum';
import type { ForumBoardListItem, ForumThreadRecord } from '@/types/forum';

type ForumThreadActionsProps = {
  thread: ForumThreadRecord;
  boards: Pick<ForumBoardListItem, 'id' | 'name'>[];
};

export function ForumThreadActions({ thread, boards }: ForumThreadActionsProps) {
  const t = useTranslations('help.forumPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { executeAsync: setFlags } = useAction(updateForumThreadFlagsAction);
  const { executeAsync: remove, isExecuting: isDeleting } = useAction(deleteForumThreadAction);

  const hasMenu = thread.canRename || thread.canModerate || thread.canDelete;
  if (!hasMenu) return null;

  const runFlags = async (data: { pinned?: boolean; locked?: boolean }) => {
    const result = await setFlags({ id: thread.id, ...data });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    toast.success(t('saved'));
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t('threadActions')}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('threadActions')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end">
          {thread.canRename ? (
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>{t('rename')}</DropdownMenuItem>
          ) : null}
          {thread.canModerate ? (
            <DropdownMenuItem onClick={() => setMoveOpen(true)}>{t('move')}</DropdownMenuItem>
          ) : null}
          {thread.canModerate ? (
            <DropdownMenuItem onClick={() => void runFlags({ pinned: !thread.pinned })}>
              {thread.pinned ? t('unpin') : t('pin')}
            </DropdownMenuItem>
          ) : null}
          {thread.canModerate ? (
            <DropdownMenuItem onClick={() => void runFlags({ locked: !thread.locked })}>
              {thread.locked ? t('unlock') : t('lock')}
            </DropdownMenuItem>
          ) : null}
          {thread.canDelete ? (
            <DropdownMenuItem onClick={() => setConfirmDelete(true)}>{tUi('delete')}</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog open={renameOpen} title={thread.title} threadId={thread.id} onOpenChange={setRenameOpen} />
      <MoveDialog
        open={moveOpen}
        threadId={thread.id}
        boardId={thread.board.id}
        boards={boards}
        onOpenChange={setMoveOpen}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteThreadTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteThreadDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tUi('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async () => {
                const result = await remove({ id: thread.id });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('deleted'));
                router.push(`/help/forum/${thread.board.slug}`);
                router.refresh();
              }}
            >
              {tUi('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenameDialog({
  open,
  title,
  threadId,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  threadId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('help.forumPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const { executeAsync, isExecuting } = useAction(renameForumThreadAction);
  const form = useForm({
    resolver: zodResolver(forumThreadRenameSchema.omit({ id: true })),
    defaultValues: { title },
    values: { title },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('renameTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit(async (data) => {
                const result = await executeAsync({ id: threadId, title: data.title });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('saved'));
                onOpenChange(false);
                router.refresh();
              })();
            }}
          >
            <FormField name="title" label={t('renameTitle')} />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isExecuting}>
                {tUi('save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  open,
  threadId,
  boardId,
  boards,
  onOpenChange,
}: {
  open: boolean;
  threadId: string;
  boardId: string;
  boards: Pick<ForumBoardListItem, 'id' | 'name'>[];
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('help.forumPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const { executeAsync, isExecuting } = useAction(moveForumThreadAction);
  const form = useForm({
    resolver: zodResolver(forumThreadMoveSchema.omit({ id: true })),
    defaultValues: { boardId },
    values: { boardId },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moveTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit(async (data) => {
                const result = await executeAsync({ id: threadId, boardId: data.boardId });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('saved'));
                onOpenChange(false);
                const slug = result?.data && 'boardSlug' in result.data ? result.data.boardSlug : null;
                if (slug) {
                  router.push(`/help/forum/${slug}/${threadId}`);
                }
                router.refresh();
              })();
            }}
          >
            <FormSelect
              name="boardId"
              label={t('moveTo')}
              placeholder={t('moveTo')}
              options={boards.map((board) => ({ value: board.id, label: board.name }))}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isExecuting}>
                {tUi('save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
