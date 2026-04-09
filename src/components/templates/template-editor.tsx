'use client';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { updateTemplateAction } from '@/actions/templates/mutations/update-template';
import { getProjectsForTemplateSampleAction } from '@/actions/templates/queries/get-template-data';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SampleDataSelector } from './sample-data-selector';
import { TemplateEditorView } from './template-editor-view';

interface TemplateEditorProps {
  template: {
    id: string;
    name: string;
    type: TemplateType;
    dataset: TemplateDataset;
    designJson: unknown;
    projectId: string | null;
    isGlobal: boolean;
  };
  projectId?: string;
  isAdmin?: boolean;
}

export function TemplateEditor({ template, projectId, isAdmin = false }: TemplateEditorProps) {
  const t = useTranslations('templates');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sampleProjectId, setSampleProjectId] = useState<string | null>(null);
  const [pendingDesign, setPendingDesign] = useState<object | null>(null);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);

  const { executeAsync: updateTemplate, isExecuting } = useAction(updateTemplateAction);

  const contextProjectId = template.projectId ?? projectId;
  const needsProjectPickerForSample = isAdmin && template.isGlobal && !contextProjectId;
  const previewProjectId = contextProjectId ?? sampleProjectId;

  const { data: sampleProjects, isLoading: sampleProjectsLoading } = useQuery({
    queryKey: ['template-editor-sample-projects'],
    queryFn: () => getProjectsForTemplateSampleAction(),
    enabled: needsProjectPickerForSample,
  });

  useEffect(() => {
    if (!needsProjectPickerForSample) return;
    if (!sampleProjects?.length) return;
    if (sampleProjectId != null && sampleProjects.some((p) => p.id === sampleProjectId)) return;
    setSampleProjectId(sampleProjects[0].id);
  }, [needsProjectPickerForSample, sampleProjects, sampleProjectId]);

  const handleDesignChange = useCallback((design: object, html: string) => {
    setPendingDesign(design);
    setPendingHtml(html);
  }, []);

  const handleSave = async () => {
    if (!pendingDesign) {
      toast.error(t('editor.noChanges'));
      return;
    }

    const result = await updateTemplate({
      templateId: template.id,
      designJson: pendingDesign as Record<string, unknown>,
      htmlContent: pendingHtml,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('editor.saved'));
    }
  };

  const handleSampleRecordChange = useCallback((value: string | null) => {
    setSelectedRecordId(value);
    if (template.dataset === 'LENDER_YEARLY') {
      setSelectedYear(null);
    }
  }, [template.dataset]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset lender/year when preview project changes
  useEffect(() => {
    setSelectedRecordId(null);
    setSelectedYear(null);
  }, [previewProjectId]);

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{template.name}</h1>
          {needsProjectPickerForSample && (
            <Select
              value={sampleProjectId ?? undefined}
              onValueChange={(val) => setSampleProjectId(val || null)}
              disabled={sampleProjectsLoading}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={sampleProjectsLoading ? 'Laden...' : t('editor.selectSampleProject')} />
              </SelectTrigger>
              <SelectContent>
                {sampleProjects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
                {!sampleProjectsLoading && (!sampleProjects || sampleProjects.length === 0) && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('editor.noSampleRecords')}</div>
                )}
              </SelectContent>
            </Select>
          )}
          {previewProjectId && (
            <SampleDataSelector
              dataset={template.dataset}
              projectId={previewProjectId}
              value={selectedRecordId}
              onChange={handleSampleRecordChange}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          )}
        </div>
        <Button onClick={handleSave} disabled={isExecuting || !pendingDesign}>
          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {t('editor.save')}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <TemplateEditorView
          templateType={template.type}
          dataset={template.dataset}
          projectId={previewProjectId ?? undefined}
          isAdmin={isAdmin}
          isGlobalTemplate={template.isGlobal}
          initialDesign={template.designJson as object}
          selectedRecordId={selectedRecordId}
          selectedYear={selectedYear}
          onDesignChange={handleDesignChange}
        />
      </div>
    </div>
  );
}
