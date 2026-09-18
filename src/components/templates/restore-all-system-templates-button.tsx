'use client';

import { FolderSync } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { restoreAllSystemTemplatesFromFileAction } from '@/actions/templates/mutations/restore-system-template-from-file';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

export function RestoreAllSystemTemplatesButton() {
  const t = useTranslations('templates');
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { executeAsync, isExecuting } = useAction(restoreAllSystemTemplatesFromFileAction);

  const handleConfirm = async () => {
    const result = await executeAsync({});
    if (result?.serverError) {
      toast.error(result.serverError);
    } else if (result?.data) {
      const { restored, failed, total } = result.data;
      if (restored === 0) {
        toast.error(t('list.restoreAllFromFileNone'));
      } else if (failed > 0) {
        toast.success(t('list.restoreAllFromFilePartial', { restored, total }));
      } else {
        toast.success(t('list.restoreAllFromFileSuccess', { count: restored }));
      }
      router.refresh();
    }
    setConfirmOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" disabled={isExecuting} onClick={() => setConfirmOpen(true)}>
        <FolderSync className="h-4 w-4 mr-2" />
        {t('list.actions.restoreAllFromFile')}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
        title={t('list.restoreAllFromFileDialog.title')}
        description={t('list.restoreAllFromFileDialog.description')}
        confirmText={t('list.restoreAllFromFileDialog.confirm')}
        cancelText={t('list.restoreAllFromFileDialog.cancel')}
      />
    </>
  );
}
