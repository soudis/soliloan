'use client';

import { Puck } from '@puckeditor/core';
import { ListTree, Plus, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROOT_ZONE } from '@/lib/templates/puck-subtree';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { OutlineDisplayNames } from './outline-display-names';
import { SettingsPanel } from './settings-panel';
import { Toolbox } from './toolbox';
import { useTemplatePuck } from './use-template-puck';

const CANVAS_POINTER_TARGET = [
  '[data-puck-component]',
  '[data-puck-dropzone]',
  '[data-puck-preview]',
  '[data-puck-overlay-portal]',
  '[data-outline-root]',
].join(', ');
const SELECTION_POINTER_WINDOW_MS = 250;

export function EditorSidebar() {
  const t = useTranslations('templates.editor');
  const [tab, setTab] = useState('toolbox');
  const prevSelectedIdRef = useRef<string | undefined>(undefined);
  const didInitSelectionRef = useRef(false);
  const lastCanvasPointerAtRef = useRef(0);
  const revertedSelectionRef = useRef<string | undefined>(undefined);

  const selectedId = useTemplatePuck((state) => state.selectedItem?.props.id as string | undefined);
  const dispatch = useTemplatePuck((state) => state.dispatch);
  const getSelectorForId = useTemplatePuck((state) => state.getSelectorForId);
  const dispatchRef = useRef(dispatch);
  const getSelectorRef = useRef(getSelectorForId);
  dispatchRef.current = dispatch;
  getSelectorRef.current = getSelectorForId;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(CANVAS_POINTER_TARGET)) {
        lastCanvasPointerAtRef.current = Date.now();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  useEffect(() => {
    if (!didInitSelectionRef.current) {
      didInitSelectionRef.current = true;
      prevSelectedIdRef.current = selectedId;
      return;
    }

    if (selectedId === prevSelectedIdRef.current) return;

    const fromPointer = Date.now() - lastCanvasPointerAtRef.current < SELECTION_POINTER_WINDOW_MS;

    const restoreSelection = () => {
      if (revertedSelectionRef.current === selectedId) return;
      revertedSelectionRef.current = selectedId;
      const previousId = prevSelectedIdRef.current;
      if (!previousId) {
        dispatchRef.current({ type: 'setUi', ui: { itemSelector: null } });
        return;
      }
      const selector = getSelectorRef.current(previousId);
      if (!selector || selector.index < 0) return;
      dispatchRef.current({
        type: 'setUi',
        ui: { itemSelector: { index: selector.index, zone: selector.zone ?? ROOT_ZONE } },
      });
    };

    if (selectedId === undefined) {
      if (!fromPointer) {
        restoreSelection();
        return;
      }
      const timeout = window.setTimeout(() => {
        prevSelectedIdRef.current = undefined;
      }, 50);
      return () => window.clearTimeout(timeout);
    }

    if (!fromPointer) {
      restoreSelection();
      return;
    }

    revertedSelectionRef.current = undefined;
    setTab('settings');
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  return (
    <TooltipProvider>
      <div className="template-puck-sidebar flex min-h-full flex-1 flex-col bg-background text-foreground">
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-full flex-1 flex-col">
          <div className="shrink-0 border-b px-4 py-2">
            <TabsList variant="modern" className="mt-0 flex w-full">
              <TabsTrigger variant="modern" size="sm" value="toolbox" className="min-w-0 flex-1 md:flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent>{t('sidebar.tabToolbox')}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger variant="modern" size="sm" value="settings" className="min-w-0 flex-1 md:flex-1">
                <Settings />
              </TabsTrigger>
              <TabsTrigger variant="modern" size="sm" value="hierarchy" className="min-w-0 flex-1 md:flex-1">
                <ListTree />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="toolbox"
            className="mt-0 min-h-0 flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-0"
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
            data-outline-root=""
            className="mt-0 min-h-0 flex-1 overflow-y-auto p-2 focus-visible:outline-none focus-visible:ring-0"
          >
            <Puck.Outline />
            <OutlineDisplayNames />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
