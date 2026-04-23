'use client';

import { useEditor } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getNodeEditorLabel, setNodeDisplayName } from '@/lib/templates/craft-node-name';

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
}) {
  const node = nodes[id];
  if (!node) return null;

  const childIds = node.data.nodes ?? [];
  const label = getNodeEditorLabel(node.data, id);
  const isSelected = selectedId === id;
  const isEditing = editingId === id;

  return (
    <>
      {isEditing ? (
        <div style={{ paddingLeft: 8 + depth * 14 }} className="py-1 pr-2">
          <Input
            autoFocus
            className="h-8 text-xs"
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
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'w-full text-left text-xs py-1.5 pr-2 rounded-md transition-colors hover:bg-zinc-100',
            isSelected && 'bg-zinc-200 text-zinc-900',
            !isSelected && 'text-zinc-700',
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => onSelect(id)}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartEdit(id);
          }}
        >
          <span className="truncate">{label}</span>
        </button>
      )}
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
    (id: string) => {
      const node = nodes[id];
      const label = getNodeEditorLabel(node?.data ?? {}, id);
      setEditingId(id);
      setEditDraft(label);
    },
    [nodes],
  );

  const onCommitEdit = useCallback(
    (id: string) => {
      const draft = editDraftRef.current.trim();
      setEditingId(null);
      if (!draft) return;
      const prev = getNodeEditorLabel(nodes[id]?.data ?? {}, id);
      if (draft === prev) return;
      setNodeDisplayName(actions, id, draft);
    },
    [actions, nodes],
  );

  const onBlurCommit = useCallback(
    (id: string) => {
      if (cancelBlurRef.current) {
        cancelBlurRef.current = false;
        return;
      }
      onCommitEdit(id);
    },
    [onCommitEdit],
  );

  const onCancelEdit = useCallback(() => {
    cancelBlurRef.current = true;
    setEditingId(null);
  }, []);

  const onSelect = useCallback(
    (id: string) => {
      onBeforeSelectNode?.();
      actions.selectNode(id);
    },
    [actions, onBeforeSelectNode],
  );

  if (!nodes[ROOT_ID]) {
    return <div className="p-4 text-xs text-zinc-500 text-center">{t('hierarchy.empty')}</div>;
  }

  return (
    <div className="p-2 pb-4">
      <p className="text-[10px] text-zinc-400 px-1 pb-2">{t('hierarchy.doubleClickHint')}</p>
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
      />
    </div>
  );
}
