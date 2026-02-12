'use client';

import { Editor, Element, Frame, useEditor, useNode } from '@craftjs/core';
import type { TemplateDataset } from '@prisma/client';
import debounce from 'lodash.debounce';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type MergeTagConfig, getMergeTagConfigAction } from '@/actions/templates/queries/get-merge-tags';
import { getMergeTagValuesAction } from '@/actions/templates/queries/get-sample-data';

import { generateEmailHtml } from '@/lib/templates/email-generator';
import { processTemplate } from '@/lib/templates/template-processor';
import { isEmpty } from 'lodash';
import { MergeTagConfigProvider } from './merge-tag-context';
import { SettingsPanel } from './settings-panel';
import { Toolbox } from './toolbox';
import { USER_COMPONENTS } from './user-components';
import { Container } from './user-components/container';

/**
 * RenderNode handles the visual indicators (selection, hover) for components in the editor.
 */
const RenderNode = ({ render }: { render: React.ReactNode }) => {
  const {
    id,
    isRoot,
    isSelected,
    isHovered,
    name,
    connectors: { connect, drag },
  } = useNode((node) => ({
    id: node.id,
    isRoot: node.id === 'ROOT',
    isSelected: node.events.selected,
    isHovered: node.events.hovered,
    name: node.data.name,
  }));

  // Style for selection and hover
  const indicatorClass = useMemo(() => {
    if (isRoot) return '';
    if (isSelected) return 'outline outline-2 outline-blue-500 z-10';
    if (isHovered) return 'outline outline-1 outline-blue-300 z-10';
    return '';
  }, [isSelected, isHovered, isRoot]);

  return (
    <div
      ref={(ref) => {
        if (ref) {
          // IMPORTANT: We only use connect(ref) here to enable selection and drop zones.
          // We DO NOT call drag(ref) on the main wrapper to prevent selection/click interference.
          connect(ref);
        }
      }}
      className={`relative ${indicatorClass}`}
    >
      {isSelected && !isRoot && (
        <>
          <div className="absolute top-0 right-0 -translate-y-full bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-t-sm font-bold pointer-events-none z-20">
            {name}
          </div>
          {/* Global Drag Handle - The ONLY way to move components */}
          <div
            ref={(ref) => {
              if (ref) drag(ref);
            }}
            className="absolute -left-6 top-0 p-1 bg-blue-500 text-white rounded-l-md cursor-move z-30 flex items-center justify-center hover:bg-blue-600 shadow-sm"
            title="Ziehen zum Verschieben"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </>
      )}
      {render}
    </div>
  );
};

// UI Components to separate concerns
const EditorTopbar = ({
  isPreviewing,
  togglePreview,
}: {
  isPreviewing: boolean;
  togglePreview: () => void;
}) => {
  const t = useTranslations('templates.editor');

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-zinc-50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePreview}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isPreviewing ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white border text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          {isPreviewing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {isPreviewing ? t('showEditor') : t('showPreview')}
        </button>
      </div>

      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {t('autoSaveActive')}
      </div>
    </div>
  );
};

const EditorViewport = ({ isPreviewing, previewHtml }: { isPreviewing: boolean; previewHtml: string }) => {
  return (
    <div className="flex-1 bg-zinc-100 overflow-y-auto w-full h-full">
      {/* Canvas Container - Using margin auto for centering instead of flexbox 
          to prevent craft.js indicator position offset issues */}
      <div
        className={`bg-white shadow-sm min-h-[600px] w-full max-w-[600px] flex flex-col relative mx-auto my-12 ${
          isPreviewing ? 'invisible h-0 overflow-hidden' : ''
        }`}
      >
        <Frame>
          <Element is={Container} padding={40} background="#ffffff" canvas id="ROOT" />
        </Frame>
      </div>
    </div>
  );
};

const InternalEditor = ({
  isPreviewing,
  previewHtml,
}: {
  isPreviewing: boolean;
  previewHtml: string;
}) => {
  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Viewport is now at 0,0 of this relative container */}
      <EditorViewport isPreviewing={isPreviewing} previewHtml={previewHtml} />

      {/* Sidebar on the right */}
      {!isPreviewing && (
        <div className="w-80 border-l overflow-y-auto bg-white flex flex-col z-20">
          <div className="border-b">
            <Toolbox />
          </div>
          <div className="flex-1">
            <SettingsPanel />
          </div>
        </div>
      )}

      {/* Preview Layer overlaying the workspace */}
      {isPreviewing && (
        <div className="absolute inset-0 bg-zinc-100 p-8 flex flex-col items-center z-30">
          <div className="bg-white shadow-sm min-h-[600px] w-full max-w-[600px]">
            <iframe title="Email Preview" srcDoc={previewHtml} className="w-full h-full min-h-[600px] border-none" />
          </div>
        </div>
      )}
    </div>
  );
};

interface EmailEditorComponentProps {
  dataset: TemplateDataset;
  projectId?: string;
  initialDesign?: string | object;
  selectedRecordId: string | null;
  onDesignChange: (design: object, html: string) => void;
}

export function EmailEditorComponent({
  dataset,
  projectId,
  initialDesign,
  selectedRecordId,
  onDesignChange,
}: EmailEditorComponentProps) {
  const [mergeTagConfig, setMergeTagConfig] = useState<MergeTagConfig | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [currentDesign, setCurrentDesign] = useState<object | null>(null);
  const [currentHtml, setCurrentHtml] = useState<string>('');
  const initializedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    getMergeTagConfigAction(dataset, projectId).then(setMergeTagConfig);
  }, [dataset, projectId]);

  // Sync initial design to local state for preview
  useEffect(() => {
    if (initialDesign && initialDesign !== '{}' && !isEmpty(initialDesign)) {
      try {
        const designData = typeof initialDesign === 'string' ? JSON.parse(initialDesign) : initialDesign;
        setCurrentDesign(designData);
        setCurrentHtml(generateEmailHtml(designData));
      } catch (e) {
        console.error('Error initializing design state', e);
      }
    }
  }, [initialDesign]);

  const togglePreview = async () => {
    if (isPreviewing) {
      setIsPreviewing(false);
      return;
    }

    let html = currentHtml;
    if (selectedRecordId) {
      try {
        const data = await getMergeTagValuesAction(dataset, selectedRecordId);
        if (data) {
          html = processTemplate(html, data);
        }
      } catch (e) {
        console.error('Preview error', e);
      }
    }

    setPreviewHtml(html);
    setIsPreviewing(true);
  };

  // Debounced update to the parent state to ensure editor stability
  const debouncedDesignChange = useMemo(
    () =>
      debounce((query: ReturnType<typeof useEditor>['query']) => {
        const serialized = query.serialize();
        const nodes = JSON.parse(serialized);
        const html = generateEmailHtml(nodes);
        setCurrentDesign(nodes);
        setCurrentHtml(html);
        onDesignChange(nodes, html);
      }, 500),
    [onDesignChange],
  );

  if (!isMounted) return null;

  return (
    <div className="min-h-[700px] border rounded-lg overflow-hidden flex flex-col bg-white">
      <EditorTopbar isPreviewing={isPreviewing} togglePreview={togglePreview} />

      <div className="flex-1 flex flex-col relative">
        <MergeTagConfigProvider value={mergeTagConfig}>
          <Editor
            resolver={USER_COMPONENTS}
            onNodesChange={debouncedDesignChange}
            onRender={(props) => <RenderNode {...props} />}
            enabled={true}
            indicator={{
              success: '#22c55e',
              error: '#ef4444',
            }}
          >
            <EditorInitialWrapper initialDesign={initialDesign} />
            <InternalEditor isPreviewing={isPreviewing} previewHtml={previewHtml} />
          </Editor>
        </MergeTagConfigProvider>
      </div>
    </div>
  );
}

const EditorInitialWrapper = ({ initialDesign }: { initialDesign?: string | object }) => {
  const { actions } = useEditor();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    if (initialDesign && initialDesign !== '{}' && !isEmpty(initialDesign)) {
      try {
        const designData = typeof initialDesign === 'string' ? JSON.parse(initialDesign) : initialDesign;
        actions.deserialize(designData);
      } catch (e) {
        console.error('Failed to load design', e);
      }
    }
    initializedRef.current = true;
  }, [initialDesign, actions]);

  return null;
};
