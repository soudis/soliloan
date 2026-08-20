'use client';

import { Puck } from '@puckeditor/core';
import '@puckeditor/core/no-external.css';
import type { TemplateDataset, TemplateType } from '@prisma/client';
import { isEmpty } from 'lodash';
import debounce from 'lodash.debounce';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getMergeTagConfigAction, type MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';
import { getProjectLogoAction } from '@/actions/templates/queries/get-project-logo';
import { canOpenTemplatePreview } from '@/lib/templates/merge-tags';
import { getTemplateConfig } from '@/lib/templates/puck-config';
import { toPuckData } from '@/lib/templates/puck-data';
import { EditorMetadataProvider } from '../editor-context';
import { LogoProvider } from '../logo-context';
import { MergeTagConfigProvider } from '../merge-tag-context';
import { EditorSidebar } from './editor-sidebar';
import './puck-editor.css';
import { useTemplatePuck } from './use-template-puck';

const A4_WIDTH_PX = 794;
const A4_MIN_HEIGHT_PX = 1123;
const EMAIL_MAX_WIDTH_PX = 600;

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

  const isDocument = templateType === 'DOCUMENT';
  const puckData = useMemo(() => toPuckData(initialDesign, templateType), [initialDesign, templateType]);
  const config = useMemo(() => getTemplateConfig(templateType, t), [templateType, t]);

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
        onDesignChange(data, '');
      }, 500),
    [onDesignChange],
  );

  useEffect(() => {
    return () => {
      debouncedDesignChange.cancel();
    };
  }, [debouncedDesignChange]);

  const togglePreview = async () => {
    if (!isDocument) {
      setIsPreviewing((current) => !current);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      toast.info(t('previewRendererPending'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isMounted) return null;

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
              <Puck
                config={config}
                data={puckData}
                height="100%"
                iframe={{ enabled: false }}
                ui={{
                  leftSideBarVisible: false,
                  rightSideBarVisible: false,
                }}
                metadata={{
                  dataset,
                  templateType,
                  projectLogo,
                }}
                onChange={(data) => {
                  if (isEmpty(data)) return;
                  debouncedDesignChange(data);
                }}
              >
                <PreviewModeSync isPreviewing={isPreviewing} />
                <div className="flex h-full min-h-[640px] overflow-hidden">
                  <div className="h-full min-h-0 flex-1 overflow-y-auto bg-muted">
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
                    <div className="z-20 flex h-full min-h-0 w-80 shrink-0 flex-col border-l bg-background">
                      <EditorSidebar />
                    </div>
                  )}
                </div>
              </Puck>
            </MergeTagConfigProvider>
          </LogoProvider>
        </EditorMetadataProvider>
      </div>
    </div>
  );
}
