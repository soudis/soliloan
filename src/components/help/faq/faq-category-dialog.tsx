'use client';

import { FolderCog, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteFaqCategoryAction } from '@/actions/help';
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
import type { FaqTocCategory } from '@/types/faq';

import { FaqCategoryForm } from './faq-category-form';

type FaqCategoryDialogProps = {
  categories: Pick<FaqTocCategory, 'id' | 'name' | 'slug'>[];
};

export function FaqCategoryDialog({ categories }: FaqCategoryDialogProps) {
  const t = useTranslations('help.categoryDialog');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { executeAsync: remove, isExecuting } = useAction(deleteFaqCategoryAction);

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
          <FaqCategoryForm onSuccess={refresh} />
          <div className="space-y-4 border-t pt-4">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{category.name}</p>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteId(category.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{tUi('delete')}</span>
                    </Button>
                  </div>
                  <FaqCategoryForm initialData={category} onSuccess={refresh} />
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
