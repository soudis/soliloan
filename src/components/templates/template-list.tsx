'use client';

import type { CommunicationTemplate } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Edit, FileText, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTemplateAction } from '@/actions/templates/mutations/delete-template';
import { duplicateTemplateAction } from '@/actions/templates/mutations/duplicate-template';
import { getTemplatesAction } from '@/actions/templates/queries/get-templates';
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
import type { CommunicationTemplateWithProject } from '@/types/templates';
import { ConfirmDialog } from '../generic/confirm-dialog';

interface TemplateListProps {
  projectId?: string;
  isAdmin?: boolean;
  includeGlobal?: boolean;
}

export function TemplateList({ projectId, isAdmin, includeGlobal = false }: TemplateListProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const currentProjectId = useProjectId();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Pick<CommunicationTemplate, 'id' | 'name'> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['templates', projectId, isAdmin, includeGlobal],
    queryFn: async () => {
      const result = await getTemplatesAction({
        projectId,
        isGlobal: isAdmin ? true : undefined,
        includeGlobal: !isAdmin && includeGlobal,
      });
      return result?.data?.templates ?? [];
    },
  });

  const { executeAsync: deleteTemplate } = useAction(deleteTemplateAction);
  const { executeAsync: duplicateTemplate } = useAction(duplicateTemplateAction);

  const handleEdit = (template: Pick<CommunicationTemplate, 'id' | 'name' | 'isGlobal'>) => {
    if (isAdmin && template.isGlobal) {
      router.push(`/admin/templates/${template.id}`);
    } else {
      router.push(`/${currentProjectId}/configuration/templates/${template.id}`);
    }
  };

  const handleDuplicate = async (template: Pick<CommunicationTemplate, 'id' | 'name'>) => {
    const result = await duplicateTemplate({
      id: template.id,
      name: `${template.name} (${t('list.copy')})`,
      projectId: projectId,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('list.duplicated'));
      refetch();
    }
  };

  const handleDeleteClick = (template: Pick<CommunicationTemplate, 'id' | 'name'>) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    const result = await deleteTemplate({
      id: templateToDelete.id,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('list.deleted'));
      refetch();
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
          {row.original.isGlobal && (
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
            <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
              <Copy className="h-4 w-4 mr-2" />
              {t('list.actions.duplicate')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDeleteClick(row.original)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('list.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />

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
