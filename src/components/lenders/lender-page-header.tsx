'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteLenderAction } from '@/actions/lenders/mutations/delete-lender';
import { useRouter } from '@/i18n/navigation';
import { getLenderName } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { ConfirmDialog } from '../generic/confirm-dialog';
import { Button } from '../ui/button';

interface LenderPageHeaderProps {
  lender: LenderWithCalculations;
}

export function LenderPageHeader({ lender }: LenderPageHeaderProps) {
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
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
        router.push('/lenders');
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
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
          onClick={() => router.push(`/lenders/${lender.id}/edit`)}
        >
          <Pencil className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{commonT('ui.actions.edit')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfirmOpen(true)}
          className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 text-destructive hover:text-destructive/90 border-destructive/50 hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{commonT('ui.actions.delete')}</span>
        </Button>
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
