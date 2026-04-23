'use client';

import { useEditor } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { EditorHierarchyPanel } from './editor-hierarchy-panel';
import { SettingsPanel } from './settings-panel';
import { Toolbox } from './toolbox';

export function EditorSidebar() {
  const t = useTranslations('templates.editor');
  const skipSettingsOnSelectionRef = useRef(false);
  const [tab, setTab] = useState('toolbox');
  const prevSelectedIdRef = useRef<string | undefined>(undefined);

  const { selectedId } = useEditor((state) => {
    const v = state.events.selected.values().next().value;
    return {
      selectedId: typeof v === 'string' ? v : undefined,
    };
  });

  useEffect(() => {
    if (skipSettingsOnSelectionRef.current) {
      skipSettingsOnSelectionRef.current = false;
      prevSelectedIdRef.current = selectedId;
      return;
    }
    if (selectedId !== undefined && selectedId !== prevSelectedIdRef.current) {
      setTab('settings');
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b p-2">
          <TabsList variant="modern" className="mt-0 w-full">
            <TabsTrigger variant="modern" size="sm" value="toolbox" className="flex-1">
              {t('sidebar.tabToolbox')}
            </TabsTrigger>
            <TabsTrigger variant="modern" size="sm" value="settings" className="flex-1">
              {t('sidebar.tabSettings')}
            </TabsTrigger>
            <TabsTrigger variant="modern" size="sm" value="hierarchy" className="flex-1">
              {t('sidebar.tabHierarchy')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="toolbox"
          className="mt-0 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none focus-visible:ring-0"
        >
          <Toolbox />
        </TabsContent>

        <TabsContent
          value="settings"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-0"
        >
          <SettingsPanel />
        </TabsContent>

        <TabsContent
          value="hierarchy"
          className="mt-0 flex-1 min-h-0 overflow-y-auto focus-visible:outline-none focus-visible:ring-0"
        >
          <EditorHierarchyPanel
            onBeforeSelectNode={() => {
              skipSettingsOnSelectionRef.current = true;
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
