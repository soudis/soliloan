'use client';

import { Puck } from '@puckeditor/core';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { deletePredefinedBlockAction } from '@/actions/templates/mutations/delete-predefined-block';
import { getPredefinedBlocksAction } from '@/actions/templates/queries/get-predefined-blocks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isPuckData } from '@/lib/templates/puck-data';
import { useEditorMetadata } from '../editor-context';

export function Toolbox() {
  const t = useTranslations('templates.editor');
  const editorMeta = useEditorMetadata();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['predefinedBlocks', editorMeta.dataset, editorMeta.templateType, editorMeta.projectId],
    queryFn: () =>
      getPredefinedBlocksAction({
        dataset: editorMeta.dataset,
        templateType: editorMeta.templateType,
        projectId: editorMeta.projectId,
      }),
  });

  const { executeAsync: deleteBlock } = useAction(deletePredefinedBlockAction);

  const handleDelete = useCallback(
    async (blockId: string) => {
      const result = await deleteBlock({ id: blockId });
      if (result?.serverError) {
        toast.error(result.serverError);
      } else {
        toast.success(t('toolbox.predefinedDeleted'));
        refetch();
      }
    },
    [deleteBlock, refetch, t],
  );

  const blocks = data?.data?.blocks ?? [];

  return (
    <div className="space-y-3 p-4">
      <Tabs defaultValue="basic">
        <TabsList variant="modern" className="mt-0 flex w-full">
          <TabsTrigger variant="modern" size="sm" value="basic" className="min-w-0 flex-1 md:flex-1">
            {t('toolbox.tabBasic')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="predefined" className="min-w-0 flex-1 md:flex-1">
            {t('toolbox.tabPredefined')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-3 focus-visible:outline-none">
          <div className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            {t('toolbox.title')}
          </div>
          <Puck.Components />
        </TabsContent>

        <TabsContent value="predefined" className="mt-3 focus-visible:outline-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-xs">{t('toolbox.predefinedLoading')}</span>
            </div>
          ) : blocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">{t('toolbox.predefinedEmpty')}</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <p className="text-xs text-muted-foreground">{t('toolbox.predefinedNotReady')}</p>
              {blocks.map((block) => (
                <PredefinedBlockItem
                  key={block.id}
                  name={block.name}
                  description={block.description}
                  insertable={isPuckData(block.designJson)}
                  isAdmin={editorMeta.isAdmin}
                  onDelete={() => handleDelete(block.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PredefinedBlockItem({
  name,
  description,
  insertable,
  isAdmin,
  onDelete,
}: {
  name: string;
  description: string | null;
  insertable: boolean;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted p-3 ${
          insertable ? 'cursor-move' : 'cursor-not-allowed opacity-60'
        }`}
      >
        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">{name}</div>
          {description && <div className="truncate text-[10px] text-muted-foreground">{description}</div>}
        </div>
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
