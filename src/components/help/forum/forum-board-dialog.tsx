'use client';

import { FolderCog, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteForumBoardAction } from '@/actions/help';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import type { ForumBoardListItem, ForumManagerOption } from '@/types/forum';

import { ForumBoardForm } from './forum-board-form';

type ForumBoardDialogProps = {
  boards: ForumBoardListItem[];
  managers: ForumManagerOption[];
  defaultOpen?: boolean;
};

export function ForumBoardDialog({ boards, managers, defaultOpen = false }: ForumBoardDialogProps) {
  const t = useTranslations('help.boardDialog');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { executeAsync: remove, isExecuting } = useAction(deleteForumBoardAction);

  const refresh = () => router.refresh();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <FolderCog className="mr-2 h-4 w-4" />
            {t('title')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <ForumBoardForm managers={managers} onSuccess={refresh} />
          <div className="space-y-4 border-t pt-4">
            {boards.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              boards.map((board) => (
                <div key={board.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{board.name}</p>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteId(board.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{tUi('delete')}</span>
                    </Button>
                  </div>
                  <ForumBoardForm
                    initialData={{
                      id: board.id,
                      name: board.name,
                      slug: board.slug,
                      description: board.description,
                      moderatorIds: board.moderatorIds,
                    }}
                    managers={managers}
                    onSuccess={refresh}
                  />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(next) => !next && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tUi('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isExecuting}
              onClick={async () => {
                if (!deleteId) return;
                const result = await remove({ id: deleteId });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('deleted'));
                setDeleteId(null);
                refresh();
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
