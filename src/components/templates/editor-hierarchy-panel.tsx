'use client';

import { useEditor } from '@craftjs/core';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getNodeEditorLabel, setNodeDisplayName } from '@/lib/templates/craft-node-name';
import { cn } from '@/lib/utils';

const ROOT_ID = 'ROOT';

type NodesState = Record<
  string,
  {
    data: {
      name?: string;
      displayName?: string;
      nodes?: string[];
    };
  }
>;

function HierarchyRows({
  id,
  depth,
  nodes,
  selectedId,
  onSelect,
  editingId,
  editDraft,
  setEditDraft,
  onStartEdit,
  onCommitEdit,
  onBlurCommit,
  onCancelEdit,
  renameAriaLabel,
}: {
  id: string;
  depth: number;
  nodes: NodesState;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  editingId: string | null;
  editDraft: string;
  setEditDraft: (v: string) => void;
  onStartEdit: (id: string) => void;
  onCommitEdit: (id: string) => void;
  onBlurCommit: (id: string) => void;
  onCancelEdit: () => void;
  renameAriaLabel: string;
}) {
  const node = nodes[id];
  if (!node) return null;

  const childIds = node.data.nodes ?? [];
  const label = getNodeEditorLabel(node.data, id);
  const isSelected = selectedId === id;
  const isEditing = editingId === id;

  const rowPaddingLeft = 8 + depth * 14;

  const rowChrome = (
    <>
      {isEditing ? (
        <Input
          autoFocus
          className="h-8 min-w-0 flex-1 text-xs"
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => onBlurCommit(id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitEdit(id);
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancelEdit();
            }
          }}
        />
      ) : (
        <>
          <button
            type="button"
            className={cn(
              'flex min-h-8 flex-1 min-w-0 items-center truncate rounded-md py-1.5 pl-0.5 pr-1 text-left text-xs transition-colors hover:bg-muted',
              isSelected && 'bg-accent text-foreground hover:bg-accent',
              !isSelected && 'text-foreground',
            )}
            onClick={() => onSelect(id)}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartEdit(id);
            }}
          >
            <span className="truncate">{label}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground opacity-65 hover:bg-muted hover:opacity-100"
            aria-label={renameAriaLabel}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(id);
              onStartEdit(id);
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <div
        className="flex w-full min-h-8 flex-nowrap items-center gap-x-0.5 pr-2"
        style={{ paddingLeft: rowPaddingLeft }}
      >
        {rowChrome}
      </div>
      {childIds.map((childId) => (
        <HierarchyRows
          key={childId}
          id={childId}
          depth={depth + 1}
          nodes={nodes}
          selectedId={selectedId}
          onSelect={onSelect}
          editingId={editingId}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          onStartEdit={onStartEdit}
          onCommitEdit={onCommitEdit}
          onBlurCommit={onBlurCommit}
          onCancelEdit={onCancelEdit}
          renameAriaLabel={renameAriaLabel}
        />
      ))}
    </>
  );
}

type EditorHierarchyPanelProps = {
  onBeforeSelectNode?: () => void;
};

export function EditorHierarchyPanel({ onBeforeSelectNode }: EditorHierarchyPanelProps) {
  const t = useTranslations('templates.editor');
  const { actions } = useEditor();

  const { nodes, selectedId } = useEditor((state) => {
    const selected = state.events.selected.values().next().value as string | undefined;
    return {
      nodes: state.nodes as NodesState,
      selectedId: selected,
    };
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const editDraftRef = useRef(editDraft);
  const cancelBlurRef = useRef(false);

  useEffect(() => {
    editDraftRef.current = editDraft;
  }, [editDraft]);

  const onStartEdit = useCallback(
    (nodeId: string) => {
      const node = nodes[nodeId];
      const labelStr = getNodeEditorLabel(node?.data ?? {}, nodeId);
      setEditingId(nodeId);
      setEditDraft(labelStr);
    },
    [nodes],
  );

  const onCommitEdit = useCallback(
    (nodeId: string) => {
      const draft = editDraftRef.current.trim();
      setEditingId(null);
      if (!draft) return;
      const prev = getNodeEditorLabel(nodes[nodeId]?.data ?? {}, nodeId);
      if (draft === prev) return;
      setNodeDisplayName(actions, nodeId, draft);
    },
    [actions, nodes],
  );

  const onBlurCommit = useCallback(
    (nodeId: string) => {
      if (cancelBlurRef.current) {
        cancelBlurRef.current = false;
        return;
      }
      onCommitEdit(nodeId);
    },
    [onCommitEdit],
  );

  const onCancelEdit = useCallback(() => {
    cancelBlurRef.current = true;
    setEditingId(null);
  }, []);

  const onSelect = useCallback(
    (nodeId: string) => {
      onBeforeSelectNode?.();
      actions.selectNode(nodeId);
    },
    [actions, onBeforeSelectNode],
  );

  const renameAriaLabel = t('hierarchy.renameAria');

  if (!nodes[ROOT_ID]) {
    return <div className="p-4 text-xs text-center text-muted-foreground">{t('hierarchy.empty')}</div>;
  }

  return (
    <div className="overflow-x-auto p-2 pb-4">
      <p className="pb-2 px-1 text-[10px] text-muted-foreground">{t('hierarchy.doubleClickHint')}</p>
      <HierarchyRows
        id={ROOT_ID}
        depth={0}
        nodes={nodes}
        selectedId={selectedId}
        onSelect={onSelect}
        editingId={editingId}
        editDraft={editDraft}
        setEditDraft={setEditDraft}
        onStartEdit={onStartEdit}
        onCommitEdit={onCommitEdit}
        onBlurCommit={onBlurCommit}
        onCancelEdit={onCancelEdit}
        renameAriaLabel={renameAriaLabel}
      />
    </div>
  );
}
