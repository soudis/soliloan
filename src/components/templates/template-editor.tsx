'use client';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { updateTemplateAction } from '@/actions/templates/mutations/update-template';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { EmailEditorComponent } from './email-editor';
import { SampleDataSelector } from './sample-data-selector';

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
}

export function TemplateEditor({ template, projectId }: TemplateEditorProps) {
  const t = useTranslations('templates');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [pendingDesign, setPendingDesign] = useState<object | null>(null);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);

  const { executeAsync: updateTemplate, isExecuting } = useAction(updateTemplateAction);

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
      id: template.id,
      designJson: pendingDesign,
      htmlContent: pendingHtml,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('editor.saved'));
    }
  };

  // Determine projectId for sample data - use template's project or provided projectId
  const effectiveProjectId = template.projectId ?? projectId;

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{template.name}</h1>
          {effectiveProjectId && (
            <SampleDataSelector
              dataset={template.dataset}
              projectId={effectiveProjectId}
              value={selectedRecordId}
              onChange={setSelectedRecordId}
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
        {template.type === 'EMAIL' ? (
          <EmailEditorComponent
            dataset={template.dataset}
            projectId={effectiveProjectId ?? undefined}
            initialDesign={template.designJson as object}
            selectedRecordId={selectedRecordId}
            onDesignChange={handleDesignChange}
          />
        ) : (
          // Document editor placeholder - will be implemented later
          <div className="flex items-center justify-center h-full bg-muted/50">
            <p className="text-muted-foreground">{t('editor.documentEditorComingSoon')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
