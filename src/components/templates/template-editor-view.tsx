'use client';

import { Editor, Element, Frame, useEditor, useNode } from '@craftjs/core';
import type { TemplateDataset, TemplateType } from '@prisma/client';
import { isEmpty } from 'lodash';
import debounce from 'lodash.debounce';
import { Eye, EyeOff, GripVertical, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { getMergeTagConfigAction, type MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';
import { getProjectLogoAction } from '@/actions/templates/queries/get-project-logo';
import { getMergeTagValuesAction } from '@/actions/templates/queries/get-template-data';
import { getNodeEditorLabel } from '@/lib/templates/craft-node-name';
import {
  generateDocumentParts,
  generateEmailHtml,
  getNodesMapFromDesign,
  getNodesMapFromSerialized,
} from '@/lib/templates/email-generator';
import { canOpenTemplatePreview } from '@/lib/templates/merge-tags';
import { processTemplate } from '@/lib/templates/template-processor';
import { EditorMetadataProvider } from './editor-context';
import { EditorSidebar } from './editor-sidebar';
import { LogoProvider } from './logo-context';
import { MergeTagConfigProvider } from './merge-tag-context';
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

const needsProjectScopedTemplateData = (dataset: TemplateDataset) =>
  dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY';

const needsYearForLenderYearly = (dataset: TemplateDataset) => dataset === 'LENDER_YEARLY';

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
    name: getNodeEditorLabel(node.data, node.id),
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
  sampleToolbarSlot,
  previewOpenBlocked,
}: {
  isPreviewing: boolean;
  isGeneratingPdf: boolean;
  togglePreview: () => void;
  sampleToolbarSlot?: ReactNode;
  /** When true, opening preview is disabled (still allowed to leave preview back to editor). */
  previewOpenBlocked: boolean;
}) => {
  const t = useTranslations('templates.editor');

  const previewButtonDisabled = isGeneratingPdf || (!isPreviewing && previewOpenBlocked);

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b bg-zinc-50">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{sampleToolbarSlot}</div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={togglePreview}
          disabled={previewButtonDisabled}
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
    </div>
  );
};

// ─── Viewport ────────────────────────────────────────────────────────────────

const EditorViewport = ({ isPreviewing, isDocument }: { isPreviewing: boolean; isDocument: boolean }) => {
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
        <div className="z-20 flex h-full min-h-0 w-80 shrink-0 flex-col border-l bg-white">
          <EditorSidebar />
        </div>
      )}

      {/* Preview Layer — email only: iframe renders same HTML as sent mail (margin + card shadow from wrapInDocument) */}
      {isPreviewing && !isDocument && (
        <div className="absolute inset-0 z-30 overflow-auto bg-[#f4f4f5]">
          <iframe title="Email Preview" srcDoc={previewHtml} className="block min-h-[600px] w-full border-0" />
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
  isAdmin?: boolean;
  isGlobalTemplate?: boolean;
  initialDesign?: string | object;
  /** Merge tag config and logo for `projectId` as resolved on the server (and when that id changes). */
  initialMergeTagConfig: MergeTagConfig;
  initialProjectLogo: string | null;
  initialPreviewProjectId?: string;
  selectedRecordId: string | null;
  /** Reporting year for `LENDER_YEARLY` template preview. */
  selectedYear?: number | null;
  onDesignChange: (design: object, html: string) => void;
  /** Sample data controls (project + record/year) shown next to the preview toggle. */
  sampleToolbarSlot?: ReactNode;
}

export function TemplateEditorView({
  templateType,
  dataset,
  projectId,
  isAdmin = false,
  isGlobalTemplate = false,
  initialDesign,
  initialMergeTagConfig,
  initialProjectLogo,
  initialPreviewProjectId,
  selectedRecordId,
  selectedYear,
  onDesignChange,
  sampleToolbarSlot,
}: TemplateEditorViewProps) {
  const previewOpenBlocked = !canOpenTemplatePreview({
    dataset,
    projectId,
    selectedRecordId,
    selectedYear,
  });

  const [mergeTagConfig, setMergeTagConfig] = useState<MergeTagConfig>(initialMergeTagConfig);
  const [projectLogo, setProjectLogo] = useState<string | null>(initialProjectLogo);
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

  /**
   * RSC + client re-renders can pass new object identities for `initialMergeTagConfig` / `initialProjectLogo`
   * every time; they must not be `useEffect` deps or we repeatedly POST server actions.
   */
  const serverPreviewSnapshotRef = useRef<{
    mergeTagConfig: MergeTagConfig;
    projectLogo: string | null;
    previewProjectId: string | undefined;
  } | null>(null);
  if (serverPreviewSnapshotRef.current === null) {
    serverPreviewSnapshotRef.current = {
      mergeTagConfig: initialMergeTagConfig,
      projectLogo: initialProjectLogo,
      previewProjectId: initialPreviewProjectId,
    };
  }

  const logoContextValue = useMemo(() => ({ projectLogo, appLogo: '/soliloan-logo.webp' }), [projectLogo]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const snapshot = serverPreviewSnapshotRef.current;
    if (!snapshot) return;

    if (projectId === snapshot.previewProjectId) {
      setMergeTagConfig(snapshot.mergeTagConfig);
      setProjectLogo(snapshot.projectLogo);
      return;
    }
    let cancelled = false;
    void getMergeTagConfigAction(dataset, projectId, templateType).then((config) => {
      if (!cancelled) setMergeTagConfig(config);
    });
    if (projectId) {
      void getProjectLogoAction(projectId).then((logo) => {
        if (!cancelled) setProjectLogo(logo);
      });
    } else {
      setProjectLogo(null);
    }
    return () => {
      cancelled = true;
    };
  }, [dataset, projectId, templateType]);

  // Sync initial design to local state for preview
  useEffect(() => {
    if (initialDesign && initialDesign !== '{}' && !isEmpty(initialDesign)) {
      try {
        const designData = typeof initialDesign === 'string' ? JSON.parse(initialDesign) : initialDesign;
        setCurrentDesign(designData);
        if (isDocument) {
          const nodes = getNodesMapFromDesign(designData as Record<string, unknown>);
          const parts = generateDocumentParts(nodes, { logoUrl: projectLogo });
          setCurrentHtml(parts.bodyHtml);
          setCurrentHeaderHtml(parts.headerHtml);
          setCurrentFooterHtml(parts.footerHtml);
          setCurrentHeaderPadding(parts.headerPadding);
          setCurrentFooterPadding(parts.footerPadding);
        } else {
          const nodes = getNodesMapFromDesign(designData as Record<string, unknown>);
          setCurrentHtml(generateEmailHtml(nodes, { logoUrl: projectLogo }));
        }
      } catch (e) {
        console.error('Error initializing design state', e);
      }
    }
  }, [initialDesign, isDocument, projectLogo]);

  const resolvePreviewHtml = async (): Promise<{
    html: string;
    headerHtml?: string;
    footerHtml?: string;
  }> => {
    let html = currentHtml;
    let headerHtml = currentHeaderHtml;
    let footerHtml = currentFooterHtml;

    const templateRecordId = selectedRecordId ?? (needsProjectScopedTemplateData(dataset) ? projectId : null);
    const canLoadMergeData =
      templateRecordId &&
      (!needsYearForLenderYearly(dataset) || (selectedYear != null && Number.isFinite(selectedYear)));

    if (canLoadMergeData) {
      try {
        const mergeResult = await getMergeTagValuesAction({
          dataset,
          recordId: templateRecordId,
          locale: 'de',
          projectId: projectId ?? undefined,
          year:
            needsYearForLenderYearly(dataset) && selectedYear != null && Number.isFinite(selectedYear)
              ? selectedYear
              : undefined,
        });
        const data = !mergeResult?.serverError && mergeResult.data ? mergeResult.data : null;
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
      const templateRecordId = selectedRecordId ?? (needsProjectScopedTemplateData(dataset) ? projectId : null);
      const canLoadMergeData =
        templateRecordId &&
        (!needsYearForLenderYearly(dataset) || (selectedYear != null && Number.isFinite(selectedYear)));

      if (canLoadMergeData) {
        try {
          const mergeResult = await getMergeTagValuesAction({
            dataset,
            recordId: templateRecordId,
            locale: 'de',
            projectId: projectId ?? undefined,
            year:
              needsYearForLenderYearly(dataset) && selectedYear != null && Number.isFinite(selectedYear)
                ? selectedYear
                : undefined,
          });
          const data = !mergeResult?.serverError && mergeResult.data ? mergeResult.data : null;
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
      const templateRecordId = selectedRecordId ?? (needsProjectScopedTemplateData(dataset) ? projectId : null);
      const canLoadMergeData =
        templateRecordId &&
        (!needsYearForLenderYearly(dataset) || (selectedYear != null && Number.isFinite(selectedYear)));

      if (canLoadMergeData) {
        try {
          const mergeResult = await getMergeTagValuesAction({
            dataset,
            recordId: templateRecordId,
            locale: 'de',
            projectId: projectId ?? undefined,
            year:
              needsYearForLenderYearly(dataset) && selectedYear != null && Number.isFinite(selectedYear)
                ? selectedYear
                : undefined,
          });
          if (!mergeResult?.serverError && mergeResult.data) {
            sampleData = mergeResult.data;
          }
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
          const parts = generateDocumentParts(nodes, { logoUrl: projectLogo });
          setCurrentHtml(parts.bodyHtml);
          setCurrentHeaderHtml(parts.headerHtml);
          setCurrentFooterHtml(parts.footerHtml);
          setCurrentHeaderPadding(parts.headerPadding);
          setCurrentFooterPadding(parts.footerPadding);
          onDesignChange(parsed, parts.bodyHtml);
        } else {
          const html = generateEmailHtml(nodes, { logoUrl: projectLogo });
          setCurrentHtml(html);
          onDesignChange(parsed, html);
        }
      }, 500),
    [onDesignChange, isDocument, projectLogo],
  );

  if (!isMounted) return null;

  return (
    <div className="min-h-[700px] border rounded-lg overflow-hidden flex flex-col bg-white">
      <EditorTopbar
        isPreviewing={isPreviewing}
        isGeneratingPdf={isGeneratingPdf}
        togglePreview={togglePreview}
        sampleToolbarSlot={sampleToolbarSlot}
        previewOpenBlocked={previewOpenBlocked}
      />

      <div className="flex-1 flex flex-col relative">
        <EditorMetadataProvider
          value={{
            dataset,
            templateType,
            projectId: projectId ?? null,
            isAdmin,
            isGlobalTemplate,
          }}
        >
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
                  logoUrl={projectLogo}
                />
                <InternalEditor isPreviewing={isPreviewing} previewHtml={previewHtml} isDocument={isDocument} />
              </Editor>
            </MergeTagConfigProvider>
          </LogoProvider>
        </EditorMetadataProvider>
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
  logoUrl,
}: {
  getLatestDocumentPartsRef: React.MutableRefObject<(() => DocumentParts) | null>;
  getLatestEmailHtmlRef: React.MutableRefObject<(() => string) | null>;
  logoUrl?: string | null;
}) => {
  const { query } = useEditor();

  useEffect(() => {
    const getDocumentParts = (): DocumentParts => {
      const serialized = query.serialize();
      const nodes = getNodesMapFromSerialized(serialized);
      const parts = generateDocumentParts(nodes, { logoUrl });
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
      return generateEmailHtml(nodes, { logoUrl });
    };
    getLatestDocumentPartsRef.current = getDocumentParts;
    getLatestEmailHtmlRef.current = getEmailHtml;
    return () => {
      getLatestDocumentPartsRef.current = null;
      getLatestEmailHtmlRef.current = null;
    };
  }, [query, getLatestDocumentPartsRef, getLatestEmailHtmlRef, logoUrl]);

  return null;
};
