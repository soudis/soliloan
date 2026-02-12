'use client';

import { Editor, Element, Frame, useEditor, useNode } from '@craftjs/core';
import type { TemplateDataset, TemplateType } from '@prisma/client';
import debounce from 'lodash.debounce';
import { Eye, EyeOff, GripVertical, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type MergeTagConfig, getMergeTagConfigAction } from '@/actions/templates/queries/get-merge-tags';
import { getProjectLogoAction } from '@/actions/templates/queries/get-project-logo';
import { getMergeTagValuesAction } from '@/actions/templates/queries/get-sample-data';

import {
  generateDocumentParts,
  generateEmailHtml,
  getNodesMapFromDesign,
  getNodesMapFromSerialized,
} from '@/lib/templates/email-generator';
import { processTemplate } from '@/lib/templates/template-processor';
import { isEmpty } from 'lodash';
import { LogoProvider } from './logo-context';
import { MergeTagConfigProvider } from './merge-tag-context';
import { SettingsPanel } from './settings-panel';
import { Toolbox } from './toolbox';
import { USER_COMPONENTS } from './user-components';
import { Container } from './user-components/container';
import { PageFooter } from './user-components/page-footer';
import { PageHeader } from './user-components/page-header';

// ─── A4 dimensions ──────────────────────────────────────────────────────────
// A4 = 210mm × 297mm. At 96 DPI: 1mm ≈ 3.7795px → 794px × 1123px
const A4_WIDTH_PX = 794;
const A4_MIN_HEIGHT_PX = 1123;

/** IDs that act as structural zones and should not show selection/drag handles */
const STRUCTURAL_NODE_IDS = new Set(['ROOT', 'PAGE_HEADER', 'PAGE_FOOTER', 'BODY']);

const RenderNode = ({ render }: { render: React.ReactNode }) => {
  const {
    nodeId,
    isStructural,
    isSelected,
    isHovered,
    name,
    connectors: { connect, drag },
  } = useNode((node) => ({
    nodeId: node.id,
    isStructural: STRUCTURAL_NODE_IDS.has(node.id),
    isSelected: node.events.selected,
    isHovered: node.events.hovered,
    name: node.data.name,
  }));

  // Style for selection and hover
  const indicatorClass = useMemo(() => {
    if (isStructural) return '';
    if (isSelected) return 'outline outline-2 outline-blue-500 z-10';
    if (isHovered) return 'outline outline-1 outline-blue-300 z-10';
    return '';
  }, [isSelected, isHovered, isStructural]);

  // Structural nodes need specific flex behaviour to fill the page:
  // ROOT: flex-1 + flex-col to fill the outer page container
  // BODY: flex-1 to push footer to the bottom
  const structuralClass = useMemo(() => {
    if (nodeId === 'ROOT') return 'flex-1 flex flex-col [&>*]:flex-1';
    if (nodeId === 'BODY') return 'flex-1';
    return '';
  }, [nodeId]);

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connect(ref);
        }
      }}
      className={`relative ${indicatorClass} ${structuralClass}`}
    >
      {isSelected && !isStructural && (
        <>
          <div className="absolute top-0 right-0 -translate-y-full bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-t-sm font-bold pointer-events-none z-20">
            {name}
          </div>
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

// ─── Topbar ──────────────────────────────────────────────────────────────────

const EditorTopbar = ({
  isPreviewing,
  isGeneratingPdf,
  togglePreview,
}: {
  isPreviewing: boolean;
  isGeneratingPdf: boolean;
  togglePreview: () => void;
}) => {
  const t = useTranslations('templates.editor');

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-zinc-50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePreview}
          disabled={isGeneratingPdf}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isPreviewing ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white border text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPreviewing ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {isGeneratingPdf ? t('generatingPdf') : isPreviewing ? t('showEditor') : t('showPreview')}
        </button>
      </div>

      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {t('autoSaveActive')}
      </div>
    </div>
  );
};

// ─── Viewport ────────────────────────────────────────────────────────────────

const EditorViewport = ({
  isPreviewing,
  isDocument,
}: {
  isPreviewing: boolean;
  isDocument: boolean;
}) => {
  return (
    <div className="flex-1 bg-zinc-100 overflow-y-auto w-full h-full">
      <div
        className={`bg-white shadow-sm flex flex-col relative mx-auto my-12 ${
          isPreviewing ? 'invisible h-0 overflow-hidden' : ''
        }`}
        style={
          isDocument
            ? { width: A4_WIDTH_PX, maxWidth: A4_WIDTH_PX, minHeight: A4_MIN_HEIGHT_PX }
            : { width: '100%', maxWidth: 600, minHeight: 600 }
        }
      >
        {/* A4 page border for document mode */}
        {isDocument && (
          <div
            className="pointer-events-none absolute inset-0 border border-zinc-300 z-[1]"
            style={{ minHeight: A4_MIN_HEIGHT_PX }}
          />
        )}
        <Frame>
          {isDocument ? (
            <Element is={Container} padding={0} background="#ffffff" canvas id="ROOT" layout="vertical" gap={0}>
              <Element is={PageHeader} padding={16} canvas id="PAGE_HEADER" />
              <Element is={Container} padding={56} background="#ffffff" canvas id="BODY" />
              <Element is={PageFooter} padding={16} canvas id="PAGE_FOOTER" />
            </Element>
          ) : (
            <Element is={Container} padding={40} background="#ffffff" canvas id="ROOT" />
          )}
        </Frame>
      </div>
    </div>
  );
};

// ─── Internal Editor ─────────────────────────────────────────────────────────

const InternalEditor = ({
  isPreviewing,
  previewHtml,
  isDocument,
}: {
  isPreviewing: boolean;
  previewHtml: string;
  isDocument: boolean;
}) => {
  return (
    <div className="flex-1 flex overflow-hidden relative">
      <EditorViewport isPreviewing={isPreviewing} isDocument={isDocument} />

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

      {/* Preview Layer — email only (document opens PDF in new tab) */}
      {isPreviewing && !isDocument && (
        <div className="absolute inset-0 bg-zinc-100 p-8 flex flex-col items-center z-30">
          <div className="bg-white shadow-sm min-h-[600px] w-full max-w-[600px]">
            <iframe title="Email Preview" srcDoc={previewHtml} className="w-full h-full min-h-[600px] border-none" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PDF generation helper (document templates) ──────────────────────────────

/**
 * Generate a PDF via the server-side API (design + sampleData → native react-pdf).
 */
const generateAndOpenPdf = async (params: {
  design: Record<string, unknown>;
  sampleData?: Record<string, unknown>;
  logoUrl?: string | null;
}) => {
  const response = await fetch('/api/templates/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      design: params.design,
      sampleData: params.sampleData ?? {},
      logoUrl: params.logoUrl ?? undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.details || `PDF generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// ─── Main component ──────────────────────────────────────────────────────────

interface TemplateEditorViewProps {
  templateType: TemplateType;
  dataset: TemplateDataset;
  projectId?: string;
  initialDesign?: string | object;
  selectedRecordId: string | null;
  onDesignChange: (design: object, html: string) => void;
}

export function TemplateEditorView({
  templateType,
  dataset,
  projectId,
  initialDesign,
  selectedRecordId,
  onDesignChange,
}: TemplateEditorViewProps) {
  const [mergeTagConfig, setMergeTagConfig] = useState<MergeTagConfig | null>(null);
  const [projectLogo, setProjectLogo] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [currentDesign, setCurrentDesign] = useState<object | null>(null);
  const [currentHtml, setCurrentHtml] = useState<string>('');
  const [currentHeaderHtml, setCurrentHeaderHtml] = useState<string>('');
  const [currentFooterHtml, setCurrentFooterHtml] = useState<string>('');
  const [currentHeaderPadding, setCurrentHeaderPadding] = useState<number>(16);
  const [currentFooterPadding, setCurrentFooterPadding] = useState<number>(16);

  /** Ref set by a child inside Editor to get latest document parts (avoids stale debounced state). */
  const getLatestDocumentPartsRef = useRef<(() => DocumentParts) | null>(null);
  /** Ref to get latest email HTML so preview shows current design (including borders) without waiting for debounce. */
  const getLatestEmailHtmlRef = useRef<(() => string) | null>(null);

  const isDocument = templateType === 'DOCUMENT';

  const logoContextValue = useMemo(
    () => ({ projectLogo, appLogo: '/soliloan-logo.webp' }),
    [projectLogo],
  );

  useEffect(() => {
    setIsMounted(true);
    getMergeTagConfigAction(dataset, projectId, templateType).then(setMergeTagConfig);
    if (projectId) {
      getProjectLogoAction(projectId).then(setProjectLogo);
    }
  }, [dataset, projectId, templateType]);

  // Sync initial design to local state for preview
  useEffect(() => {
    if (initialDesign && initialDesign !== '{}' && !isEmpty(initialDesign)) {
      try {
        const designData = typeof initialDesign === 'string' ? JSON.parse(initialDesign) : initialDesign;
        setCurrentDesign(designData);
        if (isDocument) {
          const nodes = getNodesMapFromDesign(designData as Record<string, unknown>);
          const parts = generateDocumentParts(nodes);
          setCurrentHtml(parts.bodyHtml);
          setCurrentHeaderHtml(parts.headerHtml);
          setCurrentFooterHtml(parts.footerHtml);
          setCurrentHeaderPadding(parts.headerPadding);
          setCurrentFooterPadding(parts.footerPadding);
        } else {
          const nodes = getNodesMapFromDesign(designData as Record<string, unknown>);
          setCurrentHtml(generateEmailHtml(nodes));
        }
      } catch (e) {
        console.error('Error initializing design state', e);
      }
    }
  }, [initialDesign, isDocument]);

  const resolvePreviewHtml = async (): Promise<{
    html: string;
    headerHtml?: string;
    footerHtml?: string;
  }> => {
    let html = currentHtml;
    let headerHtml = currentHeaderHtml;
    let footerHtml = currentFooterHtml;

    if (selectedRecordId) {
      try {
        const data = await getMergeTagValuesAction(dataset, selectedRecordId, 'de', projectId);
        if (data) {
          html = processTemplate(html, data);
          if (headerHtml) headerHtml = processTemplate(headerHtml, data);
          if (footerHtml) footerHtml = processTemplate(footerHtml, data);
        }
      } catch (e) {
        console.error('Preview error', e);
      }
    }
    return { html, headerHtml, footerHtml };
  };

  const togglePreview = async () => {
    // For email: toggle the inline iframe preview overlay (use latest serialized state so borders etc. show)
    if (!isDocument) {
      if (isPreviewing) {
        setIsPreviewing(false);
        return;
      }
      let html: string;
      const getLatestEmail = getLatestEmailHtmlRef.current;
      if (getLatestEmail) {
        html = getLatestEmail();
      } else {
        const resolved = await resolvePreviewHtml();
        html = resolved.html;
      }
      if (selectedRecordId) {
        try {
          const data = await getMergeTagValuesAction(dataset, selectedRecordId, 'de', projectId);
          if (data) html = processTemplate(html, data);
        } catch (e) {
          console.error('Preview error', e);
        }
      }
      setPreviewHtml(html);
      setIsPreviewing(true);
      return;
    }

    // For document: generate PDF via server API (design + sampleData → native react-pdf).
    setIsGeneratingPdf(true);
    try {
      const getLatest = getLatestDocumentPartsRef.current;
      let sampleData: Record<string, unknown> = {};
      if (selectedRecordId) {
        try {
          const data = await getMergeTagValuesAction(dataset, selectedRecordId, 'de', projectId);
          if (data) sampleData = data;
        } catch (e) {
          console.error('Preview error', e);
        }
      }

      if (getLatest) {
        const parts = getLatest();
        if (parts.design) {
          await generateAndOpenPdf({
            design: parts.design,
            sampleData,
            logoUrl: projectLogo,
          });
          return;
        }
      }

      throw new Error('Editor design not available for PDF. Try again in a moment.');
    } catch (e) {
      console.error('PDF generation error', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Debounced update to the parent state to ensure editor stability
  const debouncedDesignChange = useMemo(
    () =>
      debounce((query: ReturnType<typeof useEditor>['query']) => {
        const serialized = query.serialize();
        const parsed = JSON.parse(serialized) as object;
        const nodes = getNodesMapFromSerialized(serialized);
        setCurrentDesign(parsed);

        if (isDocument) {
          const parts = generateDocumentParts(nodes);
          setCurrentHtml(parts.bodyHtml);
          setCurrentHeaderHtml(parts.headerHtml);
          setCurrentFooterHtml(parts.footerHtml);
          setCurrentHeaderPadding(parts.headerPadding);
          setCurrentFooterPadding(parts.footerPadding);
          onDesignChange(parsed, parts.bodyHtml);
        } else {
          const html = generateEmailHtml(nodes);
          setCurrentHtml(html);
          onDesignChange(parsed, html);
        }
      }, 500),
    [onDesignChange, isDocument],
  );

  if (!isMounted) return null;

  return (
    <div className="min-h-[700px] border rounded-lg overflow-hidden flex flex-col bg-white">
      <EditorTopbar isPreviewing={isPreviewing} isGeneratingPdf={isGeneratingPdf} togglePreview={togglePreview} />

      <div className="flex-1 flex flex-col relative">
        <LogoProvider value={logoContextValue}>
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
              <DocumentPartsRefSetter
                getLatestDocumentPartsRef={getLatestDocumentPartsRef}
                getLatestEmailHtmlRef={getLatestEmailHtmlRef}
              />
              <InternalEditor isPreviewing={isPreviewing} previewHtml={previewHtml} isDocument={isDocument} />
            </Editor>
          </MergeTagConfigProvider>
        </LogoProvider>
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

type BorderConfig = {
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderColor: string;
  borderStyle: string;
  borderWidth: number;
};

type DocumentParts = {
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  headerPadding: number;
  footerPadding: number;
  headerBorder: BorderConfig | null;
  footerBorder: BorderConfig | null;
  /** Editor design JSON (for PDF generation from design + sampleData) */
  design?: Record<string, unknown>;
};

/**
 * Sets refs with functions that return the current document parts and email HTML from the live editor state.
 * This ensures preview (email iframe and PDF) uses the latest design including borders.
 */
const DocumentPartsRefSetter = ({
  getLatestDocumentPartsRef,
  getLatestEmailHtmlRef,
}: {
  getLatestDocumentPartsRef: React.MutableRefObject<(() => DocumentParts) | null>;
  getLatestEmailHtmlRef: React.MutableRefObject<(() => string) | null>;
}) => {
  const { query } = useEditor();

  useEffect(() => {
    const getDocumentParts = (): DocumentParts => {
      const serialized = query.serialize();
      const nodes = getNodesMapFromSerialized(serialized);
      const parts = generateDocumentParts(nodes);
      let design: Record<string, unknown> | undefined;
      try {
        design = JSON.parse(serialized) as Record<string, unknown>;
      } catch {
        design = undefined;
      }
      return {
        headerHtml: parts.headerHtml,
        bodyHtml: parts.bodyHtml,
        footerHtml: parts.footerHtml,
        headerPadding: parts.headerPadding,
        footerPadding: parts.footerPadding,
        headerBorder: parts.headerBorder ?? null,
        footerBorder: parts.footerBorder ?? null,
        design,
      };
    };
    const getEmailHtml = (): string => {
      const serialized = query.serialize();
      const nodes = getNodesMapFromSerialized(serialized);
      return generateEmailHtml(nodes);
    };
    getLatestDocumentPartsRef.current = getDocumentParts;
    getLatestEmailHtmlRef.current = getEmailHtml;
    return () => {
      getLatestDocumentPartsRef.current = null;
      getLatestEmailHtmlRef.current = null;
    };
  }, [query, getLatestDocumentPartsRef, getLatestEmailHtmlRef]);

  return null;
};
