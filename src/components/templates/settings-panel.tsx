'use client';

import { NodeProvider, useEditor } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import React from 'react';

import { getNodeEditorLabel } from '@/lib/templates/craft-node-name';

import { BlockDisplayNameField } from './block-display-name-field';

export const SettingsPanel = () => {
  const t = useTranslations('templates.editor.settings');
  const { actions } = useEditor();
  const { selected } = useEditor((state) => {
    const selectedId = state.events.selected.values().next().value;
    let selectedNode = null;

    if (selectedId) {
      const node = state.nodes[selectedId];
      selectedNode = {
        id: selectedId,
        titleLabel: getNodeEditorLabel(node.data, selectedId),
        settings: node.related?.settings,
        isDeletable: node.data.custom?.isDeletable !== false,
      };
    }

    return {
      selected: selectedNode,
    };
  });

  return selected ? (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b bg-zinc-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          {selected.titleLabel} {t('title')}
        </h3>
      </div>
      <NodeProvider id={selected.id} related>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b px-4 py-3">
            <BlockDisplayNameField />
          </div>
          {selected.settings && React.createElement(selected.settings)}

          {selected.isDeletable !== false && (
            <div className="mt-4 border-t p-4">
              <button
                type="button"
                className="w-full rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                onClick={() => {
                  actions.delete(selected.id);
                }}
              >
                {t('delete')}
              </button>
            </div>
          )}
        </div>
      </NodeProvider>
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center text-sm italic text-zinc-500">
      {t('noSelection')}
    </div>
  );
};
