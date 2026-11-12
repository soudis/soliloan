'use client';

import { Download, FileUp, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { deleteImportAction } from '@/actions/imports/mutations/delete-import';
import { getImportDeletionPreviewAction } from '@/actions/imports/queries/get-import-deletion-preview';
import { ActionButton } from '@/components/ui/action-button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useRouter } from '@/i18n/navigation';
import type { ImportDeletionPreview } from '@/lib/import/delete-import';
import type { ImportListEntry } from '@/lib/import/list-imports';
import { withProjectId } from '@/lib/project-href';
import { formatCurrency, formatDateLong } from '@/lib/utils';

type Props = {
  projectId: string;
  imports: ImportListEntry[];
};

export function ImportTab({ projectId, imports }: Props) {
  const t = useTranslations('dashboard.configuration.import');
  const locale = useLocale();
  const [deleting, setDeleting] = useState<ImportListEntry | null>(null);

  return (
    <div className="space-y-6">
      <FormSection title={t('title')} description={t('description')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('list.file')}</TableHead>
              <TableHead>{t('list.createdAt')}</TableHead>
              <TableHead className="text-right">{t('list.lenders')}</TableHead>
              <TableHead className="text-right">{t('list.loans')}</TableHead>
              <TableHead className="text-right">{t('list.kontostand')}</TableHead>
              <TableHead>{t('list.state')}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              imports.map((entry) => (
                <TableRow key={entry.id} className={entry.deletedAt ? 'text-muted-foreground' : undefined}>
                  <TableCell className="font-medium">{entry.fileName}</TableCell>
                  <TableCell>
                    {formatDateLong(entry.createdAt, locale)}
                    <div className="text-xs text-muted-foreground">{entry.createdBy}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entry.summary.lenders}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.summary.loans}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(entry.summary.totals.kontostand, locale)}
                  </TableCell>
                  <TableCell>
                    {entry.deletedAt
                      ? t('list.deleted', {
                          date: formatDateLong(entry.deletedAt, locale),
                          name: entry.deletedBy ?? '–',
                        })
                      : t('list.active')}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ActionButton
                        variant="ghost"
                        size="icon"
                        icon={<Download className="h-4 w-4" />}
                        tooltip={t('list.download')}
                        onClick={() => window.open(`/api/imports/${entry.id}/file`, '_blank')}
                      />
                      {!entry.deletedAt && (
                        <ActionButton
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          icon={<Trash2 className="h-4 w-4" />}
                          tooltip={t('list.delete')}
                          onClick={() => setDeleting(entry)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Button asChild variant="outline">
          <Link href={withProjectId('/configuration/import', projectId)}>
            <FileUp className="mr-2 h-4 w-4" />
            {t('new')}
          </Link>
        </Button>
      </FormSection>
      {deleting && <DeleteImportDialog projectId={projectId} entry={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function DeleteImportDialog({
  projectId,
  entry,
  onClose,
}: {
  projectId: string;
  entry: ImportListEntry;
  onClose: () => void;
}) {
  const t = useTranslations('dashboard.configuration.import.deleteDialog');
  const router = useRouter();
  const [preview, setPreview] = useState<ImportDeletionPreview | null>(null);
  const { execute: loadPreview, result: previewResult } = useAction(getImportDeletionPreviewAction, {
    onSuccess: ({ data }) => setPreview(data ?? null),
  });
  const { executeAsync: deleteImport, isExecuting } = useAction(deleteImportAction);
  useEffect(() => {
    loadPreview({ projectId, importId: entry.id });
  }, [loadPreview, projectId, entry.id]);

  const handleDelete = async () => {
    const result = await deleteImport({ projectId, importId: entry.id });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    toast.success(t('success'));
    onClose();
    router.refresh();
  };

  const hasLater =
    preview &&
    (preview.later.loans > 0 || preview.later.transactions > 0 || preview.later.notes > 0 || preview.later.files > 0);

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title', { fileName: entry.fileName })}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {previewResult.serverError && <p className="text-destructive">{previewResult.serverError}</p>}
              {!preview && !previewResult.serverError && <p>{t('loading')}</p>}
              {preview && (
                <>
                  <p>{t('created', preview.created)}</p>
                  {hasLater && <p className="font-medium text-destructive">{t('later', preview.later)}</p>}
                  {preview.notifiedTransactions > 0 && <p>{t('notified', { count: preview.notifiedTransactions })}</p>}
                  {preview.usedAccounts > 0 && <p>{t('usedAccounts', { count: preview.usedAccounts })}</p>}
                  <p>{t('irreversible')}</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExecuting}>{t('cancel')}</AlertDialogCancel>
          <Button variant="destructive" disabled={!preview || isExecuting} onClick={handleDelete}>
            {t('confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
