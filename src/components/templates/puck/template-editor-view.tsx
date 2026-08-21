'use client';

import { Puck } from '@puckeditor/core';
import '@puckeditor/core/no-external.css';
import type { TemplateDataset, TemplateType } from '@prisma/client';
import { isEmpty } from 'lodash';
import debounce from 'lodash.debounce';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getMergeTagConfigAction, type MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';
import { getProjectLogoAction } from '@/actions/templates/queries/get-project-logo';
import { getMergeTagValuesAction } from '@/actions/templates/queries/get-template-data';
import { generateDocumentParts, generateEmailHtml } from '@/lib/templates/email-generator';
import { canOpenTemplatePreview } from '@/lib/templates/merge-tags';
import { getTemplateConfig } from '@/lib/templates/puck-config';
import { type TemplateData, toPuckData, UnrecognizedTemplateDesignError } from '@/lib/templates/puck-data';
import { processTemplate } from '@/lib/templates/template-processor';
import { EditorMetadataProvider } from '../editor-context';
import { LogoProvider } from '../logo-context';
import { MergeTagConfigProvider } from '../merge-tag-context';
import { CanvasActionBar } from './canvas-action-bar';
import { EditorSidebar } from './editor-sidebar';
import '../user-components/tiptap/tiptap.css';
import './puck-editor.css';
import { useTemplatePuck } from './use-template-puck';

const A4_WIDTH_PX = 794;
const A4_MIN_HEIGHT_PX = 1123;
const EMAIL_MAX_WIDTH_PX = 600;

const needsProjectScopedTemplateData = (dataset: TemplateDataset) =>
  dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY';

const needsYearForLenderYearly = (dataset: TemplateDataset) => dataset === 'LENDER_YEARLY';

function PreviewModeSync({ isPreviewing }: { isPreviewing: boolean }) {
  const dispatch = useTemplatePuck((state) => state.dispatch);

  useEffect(() => {
    dispatch({
      type: 'setUi',
      ui: { previewMode: isPreviewing ? 'interactive' : 'edit' },
    });
  }, [dispatch, isPreviewing]);

  return null;
}

function LatestDesignBridge({ designRef }: { designRef: MutableRefObject<TemplateData | null> }) {
  const data = useTemplatePuck((state) => state.appState.data);
  useEffect(() => {
    designRef.current = data;
  }, [data, designRef]);
  return null;
}

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
  previewOpenBlocked: boolean;
}) => {
  const t = useTranslations('templates.editor');
  const previewButtonDisabled = isGeneratingPdf || (!isPreviewing && previewOpenBlocked);

  return (
    <div className="flex items-center gap-4 border-b bg-background px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{sampleToolbarSlot}</div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={togglePreview}
          disabled={previewButtonDisabled}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isPreviewing
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border bg-background text-foreground hover:bg-muted'
          }`}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPreviewing ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {isGeneratingPdf ? t('generatingPdf') : isPreviewing ? t('showEditor') : t('showPreview')}
        </button>
      </div>
    </div>
  );
};

interface TemplateEditorViewProps {
  templateType: TemplateType;
  dataset: TemplateDataset;
  projectId?: string;
  isAdmin?: boolean;
  isGlobalTemplate?: boolean;
  initialDesign?: string | object;
  initialMergeTagConfig: MergeTagConfig;
  initialProjectLogo: string | null;
  initialPreviewProjectId?: string;
  selectedRecordId: string | null;
  selectedYear?: number | null;
  onDesignChange: (design: object, html: string) => void;
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
  const t = useTranslations('templates.editor');
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

  const isDocument = templateType === 'DOCUMENT';
  const puckDataResult = useMemo(() => {
    try {
      return { data: toPuckData(initialDesign, templateType), error: null };
    } catch (error) {
      console.error(error);
      const message = error instanceof UnrecognizedTemplateDesignError ? error.message : 'invalid-design';
      return { data: null, error: message };
    }
  }, [initialDesign, templateType]);
  const puckData = puckDataResult.data;
  const designRef = useRef<TemplateData | null>(puckData);
  // Puck rebuilds its store (and remounts TipTap) whenever `config` identity changes.
  // next-intl's `t` is not a reliable dep; labels are static for a given template type.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keep config identity stable across parent re-renders
  const config = useMemo(() => getTemplateConfig(templateType, t), [templateType]);
  const iframeConfig = useMemo(() => ({ enabled: false as const }), []);
  const puckUi = useMemo(() => ({ leftSideBarVisible: false, rightSideBarVisible: false }), []);
  const puckDictionary = useMemo(
    () => ({
      'outline-header-title': t('hierarchy.title'),
      'outline-header-collapseall': t('hierarchy.collapseAll'),
    }),
    [t],
  );
  const puckOverrides = useMemo(
    () => ({
      actionBar: ({
        children,
        label,
        parentAction,
      }: {
        children?: ReactNode;
        label?: string;
        parentAction?: ReactNode;
      }) => (
        <CanvasActionBar label={label} parentAction={parentAction}>
          {children}
        </CanvasActionBar>
      ),
    }),
    [],
  );
  const puckMetadata = useMemo(
    () => ({
      dataset,
      templateType,
      projectLogo,
    }),
    [dataset, templateType, projectLogo],
  );
  const editorMetadata = useMemo(
    () => ({
      dataset,
      templateType,
      projectId: projectId ?? null,
      isAdmin,
      isGlobalTemplate,
    }),
    [dataset, templateType, projectId, isAdmin, isGlobalTemplate],
  );

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

  const loadPreviewSampleData = useCallback(async (): Promise<Record<string, unknown>> => {
    const templateRecordId = selectedRecordId ?? (needsProjectScopedTemplateData(dataset) ? projectId : null);
    const canLoadMergeData =
      Boolean(templateRecordId) &&
      (!needsYearForLenderYearly(dataset) || (selectedYear != null && Number.isFinite(selectedYear)));
    if (!canLoadMergeData || !templateRecordId) return {};

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
        return mergeResult.data;
      }
    } catch (error) {
      console.error('Preview error', error);
    }
    return {};
  }, [dataset, projectId, selectedRecordId, selectedYear]);

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
    void getMergeTagConfigAction(dataset, projectId, templateType).then((loaded) => {
      if (!cancelled) setMergeTagConfig(loaded);
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

  const debouncedDesignChange = useMemo(
    () =>
      debounce((data: object) => {
        if (isDocument) {
          const parts = generateDocumentParts(data, { logoUrl: projectLogo });
          onDesignChange(data, parts.bodyHtml);
          return;
        }
        onDesignChange(data, generateEmailHtml(data, { logoUrl: projectLogo }));
      }, 500),
    [onDesignChange, isDocument, projectLogo],
  );

  useEffect(() => {
    return () => {
      debouncedDesignChange.cancel();
    };
  }, [debouncedDesignChange]);

  const handlePuckChange = useCallback(
    (data: object) => {
      if (isEmpty(data)) return;
      debouncedDesignChange(data);
    },
    [debouncedDesignChange],
  );

  const togglePreview = async () => {
    const design = designRef.current;
    if (!design) return;
    if (!isDocument) {
      if (isPreviewing) {
        setIsPreviewing(false);
        return;
      }

      const html = generateEmailHtml(design, { logoUrl: projectLogo });
      const sampleData = await loadPreviewSampleData();
      setPreviewHtml(Object.keys(sampleData).length > 0 ? processTemplate(html, sampleData) : html);
      setIsPreviewing(true);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const sampleData = await loadPreviewSampleData();
      await generateAndOpenPdf({
        design: design as Record<string, unknown>,
        sampleData,
        logoUrl: projectLogo,
      });
    } catch (error) {
      console.error('PDF generation error', error);
      toast.error(t('previewFailed'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isMounted) return null;

  if (!puckData) {
    return (
      <div className="flex min-h-[700px] items-center justify-center rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {t('designLoadFailed')}
      </div>
    );
  }

  return (
    <div className="template-puck-editor flex min-h-[700px] flex-col overflow-hidden rounded-lg border bg-card">
      <EditorTopbar
        isPreviewing={isPreviewing}
        isGeneratingPdf={isGeneratingPdf}
        togglePreview={togglePreview}
        sampleToolbarSlot={sampleToolbarSlot}
        previewOpenBlocked={previewOpenBlocked}
      />

      <div className="relative flex flex-1 flex-col">
        <EditorMetadataProvider value={editorMetadata}>
          <LogoProvider value={logoContextValue}>
            <MergeTagConfigProvider value={mergeTagConfig}>
              <Puck
                config={config}
                data={puckData}
                height="100%"
                iframe={iframeConfig}
                ui={puckUi}
                overrides={puckOverrides}
                dictionary={puckDictionary}
                metadata={puckMetadata}
                onChange={handlePuckChange}
              >
                <PreviewModeSync isPreviewing={isPreviewing} />
                <LatestDesignBridge designRef={designRef} />
                <div className="flex min-h-[640px] flex-1 items-stretch overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-auto bg-muted">
                    <div
                      className="relative mx-auto my-12 flex flex-col bg-white shadow-sm"
                      style={
                        isDocument
                          ? { width: A4_WIDTH_PX, maxWidth: A4_WIDTH_PX, minHeight: A4_MIN_HEIGHT_PX }
                          : { width: '100%', maxWidth: EMAIL_MAX_WIDTH_PX, minHeight: 600 }
                      }
                    >
                      {isDocument && (
                        <div
                          className="pointer-events-none absolute inset-0 z-[1] border border-border"
                          style={{ minHeight: A4_MIN_HEIGHT_PX }}
                        />
                      )}
                      <Puck.Preview />
                    </div>
                  </div>
                  {!isPreviewing && (
                    <div className="z-20 flex w-80 shrink-0 flex-col self-stretch border-l bg-background">
                      <EditorSidebar />
                    </div>
                  )}
                </div>
              </Puck>
            </MergeTagConfigProvider>
          </LogoProvider>
        </EditorMetadataProvider>

        {isPreviewing && !isDocument && (
          <div className="absolute inset-0 z-30 overflow-auto bg-[#f4f4f5]">
            <iframe title="Email Preview" srcDoc={previewHtml} className="block min-h-[600px] w-full border-0" />
          </div>
        )}
      </div>
    </div>
  );
}
