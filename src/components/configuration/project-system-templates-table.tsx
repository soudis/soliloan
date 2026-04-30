'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Edit, Loader2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { duplicateTemplateAction } from '@/actions/templates/mutations/duplicate-template';
import { deleteTemplateAction } from '@/actions/templates/mutations/delete-template';
import {
  getProjectSystemTemplatesOverviewAction,
  type ProjectSystemTemplateOverviewRow,
} from '@/actions/templates/queries/get-project-system-templates-overview';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';

interface ProjectSystemTemplatesTableProps {
  projectId: string;
}

export function ProjectSystemTemplatesTable({ projectId }: ProjectSystemTemplatesTableProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const [rows, setRows] = useState<ProjectSystemTemplateOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Pick<
    ProjectSystemTemplateOverviewRow,
    'effectiveTemplateId' | 'name'
  > | null>(null);

  const { executeAsync: duplicateTemplate, isExecuting: isDuplicating } = useAction(duplicateTemplateAction);
  const { executeAsync: deleteTemplate, isExecuting: isDeleting } = useAction(deleteTemplateAction);

  const load = useCallback(() => {
    setLoading(true);
    getProjectSystemTemplatesOverviewAction({ projectId })
      .then((result) => {
        setRows(result?.data?.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCustomize = useCallback(
    async (row: ProjectSystemTemplateOverviewRow) => {
      const result = await duplicateTemplate({
        id: row.globalTemplateId,
        name: row.name,
        projectId,
      });

      if (result?.serverError) {
        toast.error(result.serverError);
      } else if (result?.data?.id) {
        toast.success(t('project.systemList.toast.customized'));
        load();
        router.push(`/configuration/templates/${result.data.id}`);
      }
    },
    [duplicateTemplate, load, projectId, router, t],
  );

  const handleEdit = useCallback(
    (row: ProjectSystemTemplateOverviewRow) => {
      router.push(`/configuration/templates/${row.effectiveTemplateId}`);
    },
    [router],
  );

  const handleResetConfirm = useCallback(async () => {
    if (!resetTarget) return;
    const result = await deleteTemplate({ templateId: resetTarget.effectiveTemplateId });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('project.systemList.resetDialog.success'));
      load();
      router.refresh();
    }
    setResetTarget(null);
  }, [deleteTemplate, resetTarget, load, router, t]);

  const columns = useMemo<ColumnDef<ProjectSystemTemplateOverviewRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('list.columns.name'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isProjectClone ? (
              <Badge variant="secondary" className="text-xs">
                {t('project.systemList.customizedBadge')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {t('list.system')}
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: t('list.columns.type'),
        cell: ({ row }) => <span>{row.original.type === 'EMAIL' ? t('types.email') : t('types.document')}</span>,
      },
      {
        accessorKey: 'dataset',
        header: t('list.columns.dataset'),
        cell: ({ row }) => <span>{getDatasetDisplayName(row.original.dataset)}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: t('list.columns.createdAt'),
        cell: ({ row }) => <span>{new Intl.DateTimeFormat('de-DE').format(new Date(row.original.createdAt))}</span>,
      },
    ],
    [t],
  );

  const rowActions = useCallback(
    (row: ProjectSystemTemplateOverviewRow) => {
      if (row.isProjectClone) {
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled={isDeleting || isDuplicating} onClick={() => setResetTarget(row)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('project.systemList.actions.reset')}
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                {t('project.systemList.actions.resetTooltip')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled={isDuplicating || isDeleting} onClick={() => handleEdit(row)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('list.actions.edit')}
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                {t('project.systemList.actions.editTooltip')}
              </TooltipContent>
            </Tooltip>
          </>
        );
      }

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem disabled={isDuplicating || isDeleting} onClick={() => handleCustomize(row)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('project.systemList.actions.customize')}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {t('project.systemList.actions.customizeTooltip')}
          </TooltipContent>
        </Tooltip>
      );
    },
    [handleCustomize, handleEdit, isDuplicating, isDeleting, t],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 rounded-md border text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t('project.systemList.empty')}</p>;
  }

  return (
    <TooltipProvider delayDuration={400}>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.effectiveTemplateId}
        hideHeader
        showColumnVisibility={false}
        showFilter={false}
        showPagination={false}
        actions={rowActions}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        onConfirm={handleResetConfirm}
        title={t('project.systemList.resetDialog.title')}
        description={t('project.systemList.resetDialog.description', { name: resetTarget?.name ?? '' })}
        confirmText={t('project.systemList.resetDialog.confirm')}
        cancelText={t('project.systemList.resetDialog.cancel')}
      />
    </TooltipProvider>
  );
}
