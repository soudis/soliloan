'use client';

import { Element, useEditor } from '@craftjs/core';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Layout, Loader2, MousePointer2, Package, TableIcon, Trash2, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { deletePredefinedBlockAction } from '@/actions/templates/mutations/delete-predefined-block';
import { getPredefinedBlocksAction } from '@/actions/templates/queries/get-predefined-blocks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cloneCraftSubtreeWithNewIds, findSubtreeRootId } from '@/lib/templates/craft-subtree';
import { useEditorMetadata } from './editor-context';
import { Button as USER_COMPONENTS_Button } from './user-components/button';
import { Container } from './user-components/container';
import { Image } from './user-components/image';
import { Table } from './user-components/table';
import { Text } from './user-components/text';

/**
 * Reconstruct a React element tree from a Craft.js serialized subtree.
 * The subtree is a flat map of nodeId → nodeData (same shape as query.serialize()).
 * We build the tree bottom-up: leaf nodes first, then parents wrapping children.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  Container,
  Text,
  Button: USER_COMPONENTS_Button,
  Image,
  Table,
};

function buildElementFromSubtree(
  nodesMap: Record<string, Record<string, unknown>>,
  nodeId: string,
): React.ReactElement | null {
  const node = nodesMap[nodeId];
  if (!node) return null;

  const typeName =
    typeof node.type === 'object' && node.type !== null
      ? ((node.type as Record<string, unknown>).resolvedName as string)
      : (node.type as string);

  const Component = COMPONENT_MAP[typeName];
  if (!Component) return null;

  const props = (node.props as Record<string, unknown>) ?? {};
  const childIds = (node.nodes as string[]) ?? [];
  const isCanvas = node.isCanvas === true;

  const children = childIds
    .map((cid) => buildElementFromSubtree(nodesMap, cid))
    .filter(Boolean) as React.ReactElement[];

  if (isCanvas) {
    return (
      <Element is={Component} canvas {...props}>
        {children}
      </Element>
    );
  }

  if (children.length > 0) {
    return <Component {...props}>{children}</Component>;
  }

  return <Component {...props} />;
}

export const Toolbox = () => {
  const { connectors } = useEditor();
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
        toast.success(t('toolbox.predefinedDeleted') || 'Block gelöscht');
        refetch();
      }
    },
    [deleteBlock, refetch, t],
  );

  const blocks = data?.data?.blocks ?? [];

  return (
    <div className="space-y-3 p-4">
      <Tabs defaultValue="basic">
        <TabsList variant="modern" className="mt-0 w-full">
          <TabsTrigger variant="modern" size="sm" value="basic" className="flex-1">
            {t('toolbox.tabBasic')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="predefined" className="flex-1">
            {t('toolbox.tabPredefined')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-3 focus-visible:outline-none">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('toolbox.title')}</div>
          <div className="grid grid-cols-2 gap-2">
            <div
              ref={(ref) => {
                if (ref) connectors.create(ref, <Element is={Container} canvas />);
              }}
              className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
            >
              <Layout className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
              <span className="text-xs font-medium">{t('toolbox.layout')}</span>
            </div>

            <div
              ref={(ref) => {
                if (ref) connectors.create(ref, <Text text={t('components.text.defaultText')} />);
              }}
              className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
            >
              <Type className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
              <span className="text-xs font-medium">{t('toolbox.text')}</span>
            </div>

            <div
              ref={(ref) => {
                if (ref) connectors.create(ref, <USER_COMPONENTS_Button text="Button" url="#" />);
              }}
              className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
            >
              <MousePointer2 className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
              <span className="text-xs font-medium">{t('toolbox.button')}</span>
            </div>

            <div
              ref={(ref) => {
                if (ref) connectors.create(ref, <Image src="https://via.placeholder.com/150" />);
              }}
              className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
            >
              <ImageIcon className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
              <span className="text-xs font-medium">{t('toolbox.image')}</span>
            </div>

            <div
              ref={(ref) => {
                if (ref) connectors.create(ref, <Table />);
              }}
              className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
            >
              <TableIcon className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
              <span className="text-xs font-medium">{t('toolbox.table')}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="predefined" className="mt-3 focus-visible:outline-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-xs">{t('toolbox.predefinedLoading')}</span>
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-xs text-zinc-400 text-center py-8">{t('toolbox.predefinedEmpty')}</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {blocks.map((block) => (
                <PredefinedBlockItem
                  key={block.id}
                  block={block}
                  connectors={connectors}
                  isAdmin={editorMeta.isAdmin}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function PredefinedBlockItem({
  block,
  connectors,
  isAdmin,
  onDelete,
}: {
  block: {
    id: string;
    name: string;
    description: string | null;
    designJson: unknown;
    projectId: string | null;
  };
  connectors: ReturnType<typeof useEditor>['connectors'];
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const subtree = block.designJson as Record<string, Record<string, unknown>>;
  const originalRootId = findSubtreeRootId(subtree);

  return (
    <div className="flex items-center gap-2">
      <div
        ref={(ref) => {
          if (!ref || !originalRootId) return;
          const { nodesMap, rootId } = cloneCraftSubtreeWithNewIds(subtree, originalRootId);
          const element = buildElementFromSubtree(nodesMap, rootId);
          if (element) {
            connectors.create(ref, element);
          }
        }}
        className="flex-1 flex items-center gap-2 p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
      >
        <Package className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{block.name}</div>
          {block.description && <div className="text-[10px] text-zinc-400 truncate">{block.description}</div>}
        </div>
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
          title="Löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
