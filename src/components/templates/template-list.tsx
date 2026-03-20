'use client';

import type { CommunicationTemplate } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Edit, FileText, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTemplateAction } from '@/actions/templates/mutations/delete-template';
import { duplicateTemplateAction } from '@/actions/templates/mutations/duplicate-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';
import type { ProjectWithConfiguration } from '@/types/projects';
import type { CommunicationTemplateWithProject } from '@/types/templates';
import { ConfirmDialog } from '../generic/confirm-dialog';

interface TemplateListProps {
  project?: ProjectWithConfiguration | null;
  templates?: CommunicationTemplateWithProject[];
  isAdmin?: boolean;
}

export function TemplateList({ project, templates: externalTemplates, isAdmin }: TemplateListProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const currentProjectId = useProjectId();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Pick<CommunicationTemplate, 'id' | 'name'> | null>(null);

  const { executeAsync: deleteTemplate } = useAction(deleteTemplateAction);
  const { executeAsync: duplicateTemplate } = useAction(duplicateTemplateAction);

  const handleEdit = (template: Pick<CommunicationTemplate, 'id' | 'name' | 'isGlobal'>) => {
    if (isAdmin && template.isGlobal) {
      router.push(`/admin/templates/${template.id}`);
    } else if (currentProjectId) {
      router.push(`/configuration/templates/${template.id}`);
    }
  };

  const handleDuplicate = async (template: Pick<CommunicationTemplate, 'id' | 'name'>) => {
    if (!project) return;
    const result = await duplicateTemplate({
      id: template.id,
      name: `${template.name} (${t('list.copy')})`,
      projectId: project.id,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('list.duplicated'));
    }
  };

  const handleDeleteClick = (template: Pick<CommunicationTemplate, 'id' | 'name'>) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    const result = await deleteTemplate({
      templateId: templateToDelete.id,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('list.deleted'));
    }

    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const columns: ColumnDef<CommunicationTemplateWithProject>[] = [
    {
      accessorKey: 'name',
      header: t('list.columns.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.type === 'EMAIL' ? (
            <Mail className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{row.original.name}</span>
          {row.original.isSystem && (
            <Badge variant="default" className="text-xs">
              {t('list.system')}
            </Badge>
          )}
          {row.original.isGlobal && !row.original.isSystem && (
            <Badge variant="secondary" className="text-xs">
              {t('list.global')}
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
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('list.actions.edit')}
            </DropdownMenuItem>
            {project ? (
              <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
                <Copy className="h-4 w-4 mr-2" />
                {t('list.actions.duplicate')}
              </DropdownMenuItem>
            ) : null}
            {(!row.original.isSystem || project) && (
              <DropdownMenuItem onClick={() => handleDeleteClick(row.original)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('list.actions.delete')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={
          externalTemplates ??
          (project?.templates ?? []).map((template) => ({
            ...template,
            project: project
              ? { id: project.id, configuration: { name: project.configuration.name } }
              : { id: '', configuration: { name: '' } },
            createdBy: template.createdBy,
          }))
        }
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t('list.deleteDialog.title')}
        description={t('list.deleteDialog.description', { name: templateToDelete?.name ?? '' })}
        confirmText={t('list.deleteDialog.confirm')}
        cancelText={t('list.deleteDialog.cancel')}
      />
    </>
  );
}
