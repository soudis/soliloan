'use client';

import { useEditor } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import React from 'react';

export const SettingsPanel = () => {
  const t = useTranslations('templates.editor.settings');
  const { selected, actions } = useEditor((state) => {
    const selectedId = state.events.selected.values().next().value;
    let selectedNode = null;

    if (selectedId) {
      const node = state.nodes[selectedId];
      selectedNode = {
        id: selectedId,
        name: node.data.name,
        settings: node.related?.settings,
        isDeletable: node.data.custom?.isDeletable !== false,
      };
    }

    return {
      selected: selectedNode,
    };
  });

  return selected ? (
    <div className="bg-white h-full border-l">
      <div className="px-4 py-3 border-b bg-zinc-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          {selected.name} {t('title')}
        </h3>
      </div>
      <div className="overflow-y-auto h-[calc(100%-49px)]">
        {selected.settings && React.createElement(selected.settings)}

        {selected.isDeletable !== false && (
          <div className="p-4 border-t mt-4">
            <button
              type="button"
              className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              onClick={() => {
                actions.delete(selected.id);
              }}
            >
              {t('delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="p-8 text-center text-zinc-500 h-full flex items-center justify-center italic text-sm">
      {t('noSelection')}
    </div>
  );
};
