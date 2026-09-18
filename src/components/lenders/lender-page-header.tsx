'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteLenderAction } from '@/actions/lenders/mutations/delete-lender';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { ActionButton } from '@/components/ui/action-button';
import { useRouter } from '@/i18n/navigation';
import { getLenderName } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import { ConfirmDialog } from '../generic/confirm-dialog';
import { AddEntityMenu } from './add-entity-menu';

interface LenderPageHeaderProps {
  lender: LenderWithCalculations;
  onAddNote: () => void;
  onAddFile: () => void;
}

export function LenderPageHeader({ lender, onAddNote, onAddFile }: LenderPageHeaderProps) {
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const notesT = useTranslations('dashboard.notes');
  const filesT = useTranslations('dashboard.files');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleDeleteLender = async () => {
    const toastId = toast.loading(t('delete.loading'));

    try {
      const result = await deleteLenderAction({ lenderId: lender.id });

      if (result?.serverError || result?.validationErrors) {
        toast.error(t('delete.error'), { id: toastId });
      } else {
        toast.success(t('delete.success'), { id: toastId });
        await queryClient.invalidateQueries({ queryKey: ['lender', lender.id] });
        router.push('/lenders/list');
      }
    } catch (e) {
      toast.error(t('delete.error'), { id: toastId });
      console.error('Failed to delete lender:', e);
    }
  };

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{getLenderName(lender)}</h1>
        <p className="text-muted-foreground text-sm">
          {commonT('terms.lenderNumber', { number: lender.lenderNumber })} ·{' '}
          {commonT('terms.loanCount', { count: lender.loans.length })}
        </p>
      </div>
      <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap items-center justify-end">
        <TemplateQuickActions projectId={lender.projectId} mode="lender" lenderId={lender.id} />
        <AddEntityMenu
          items={[
            {
              id: 'loan',
              label: commonT('terms.loan'),
              onSelect: () => router.push(`/loans/new?lenderId=${lender.id}`),
            },
            { id: 'note', label: notesT('text'), onSelect: onAddNote },
            { id: 'file', label: filesT('file'), onSelect: onAddFile },
          ]}
        />
        <ActionButton
          intent="edit"
          density="header"
          icon={<Pencil className="h-4 w-4" />}
          label={commonT('ui.actions.edit')}
          onClick={() => router.push(`/lenders/${lender.id}/edit`)}
        />
        <ActionButton
          intent="delete"
          density="header"
          icon={<Trash2 className="h-4 w-4" />}
          label={commonT('ui.actions.delete')}
          onClick={() => setIsConfirmOpen(true)}
        />
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => handleDeleteLender()}
        title={t('delete.confirmTitle')}
        description={t('delete.confirmDescription')}
        confirmText={commonT('ui.actions.delete')}
      />
    </div>
  );
}
