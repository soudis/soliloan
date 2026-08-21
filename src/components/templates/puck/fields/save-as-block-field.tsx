'use client';

import { TemplateDataset, TemplateType } from '@prisma/client';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { createPredefinedBlockAction } from '@/actions/templates/mutations/create-predefined-block';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { findPuckComponentById } from '@/lib/templates/puck-subtree';
import { useEditorMetadata } from '../../editor-context';
import { useTemplatePuck } from '../use-template-puck';

const DATASET_LABELS: Record<string, string> = {
  USER: 'User',
  LENDER: 'Kreditgeber',
  LOAN: 'Darlehen',
  PROJECT: 'Projekt',
  PROJECT_YEARLY: 'Projekt (jährlich)',
  LENDER_YEARLY: 'Kreditgeber (jährlich)',
  TRANSACTION: 'Transaktion',
};

export function SaveAsBlockField() {
  const t = useTranslations('templates.editor.components.container');
  const editorMeta = useEditorMetadata();
  const selectedId = useTemplatePuck((state) => state.selectedItem?.props.id as string | undefined);
  const selectedType = useTemplatePuck((state) => state.selectedItem?.type);
  const appState = useTemplatePuck((state) => state.appState);
  const config = useTemplatePuck((state) => state.config);

  const [open, setOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockDesc, setBlockDesc] = useState('');
  const [blockDatasets, setBlockDatasets] = useState<TemplateDataset[]>([editorMeta.dataset]);
  const [blockTemplateTypes, setBlockTemplateTypes] = useState<TemplateType[]>([editorMeta.templateType]);
  const [blockVisibility, setBlockVisibility] = useState<'PROJECT_MANAGERS' | 'ADMIN_ONLY'>('PROJECT_MANAGERS');
  const [isSavingBlock, setIsSavingBlock] = useState(false);

  const handleSave = useCallback(async () => {
    if (!blockName.trim() || !selectedId) return;
    setIsSavingBlock(true);
    try {
      const subtree = findPuckComponentById(appState.data, selectedId, config);
      if (!subtree) {
        toast.error(t('blockSaveError'));
        return;
      }

      const result = await createPredefinedBlockAction({
        name: blockName.trim(),
        description: blockDesc.trim() || null,
        designJson: subtree as unknown as Record<string, unknown>,
        datasets: blockDatasets,
        templateTypes: blockTemplateTypes,
        visibility: editorMeta.isAdmin && editorMeta.isGlobalTemplate ? blockVisibility : 'PROJECT_MANAGERS',
        projectId: editorMeta.isGlobalTemplate ? null : editorMeta.projectId,
      });

      if (result?.serverError) {
        toast.error(t('blockSaveError'));
      } else {
        toast.success(t('blockSaved'));
        setBlockName('');
        setBlockDesc('');
        setBlockTemplateTypes([editorMeta.templateType]);
        setOpen(false);
      }
    } catch {
      toast.error(t('blockSaveError'));
    } finally {
      setIsSavingBlock(false);
    }
  }, [
    appState.data,
    blockDesc,
    blockDatasets,
    blockName,
    blockTemplateTypes,
    blockVisibility,
    config,
    editorMeta,
    selectedId,
    t,
  ]);

  if (selectedType !== 'Container') return null;

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Save className="h-4 w-4" />
            {t('saveAsBlock')}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('saveAsBlockTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="space-y-1 text-xs">
              <span>{t('blockName')}</span>
              <input
                value={blockName}
                onChange={(event) => setBlockName(event.target.value)}
                placeholder={t('blockNamePlaceholder')}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>{t('blockDescription')}</span>
              <input
                value={blockDesc}
                onChange={(event) => setBlockDesc(event.target.value)}
                placeholder={t('blockDescriptionPlaceholder')}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </label>
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium">{t('blockTemplateTypes')}</legend>
              <p className="text-[11px] text-muted-foreground">{t('blockTemplateTypesHint')}</p>
              {([TemplateType.EMAIL, TemplateType.DOCUMENT] as const).map((templateType) => (
                <label key={templateType} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={blockTemplateTypes.includes(templateType)}
                    onChange={(event) => {
                      setBlockTemplateTypes((current) =>
                        event.target.checked
                          ? [...current, templateType]
                          : current.filter((item) => item !== templateType),
                      );
                    }}
                  />
                  {t(`blockTemplateType_${templateType}`)}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium">{t('blockDatasets')}</legend>
              {Object.values(TemplateDataset).map((dataset) => (
                <label key={dataset} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={blockDatasets.includes(dataset)}
                    onChange={(event) => {
                      setBlockDatasets((current) =>
                        event.target.checked ? [...current, dataset] : current.filter((item) => item !== dataset),
                      );
                    }}
                  />
                  {DATASET_LABELS[dataset] ?? dataset}
                </label>
              ))}
              <p className="text-[11px] text-muted-foreground">{t('blockDatasetsHint')}</p>
            </fieldset>
            {editorMeta.isAdmin && editorMeta.isGlobalTemplate && (
              <label className="space-y-1 text-xs">
                <span>{t('blockVisibility')}</span>
                <select
                  value={blockVisibility}
                  onChange={(event) => setBlockVisibility(event.target.value as 'PROJECT_MANAGERS' | 'ADMIN_ONLY')}
                  className="w-full rounded border px-2 py-1 text-sm"
                >
                  <option value="PROJECT_MANAGERS">{t('blockVisibilityAll')}</option>
                  <option value="ADMIN_ONLY">{t('blockVisibilityAdmin')}</option>
                </select>
              </label>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              disabled={
                !blockName.trim() || blockDatasets.length === 0 || blockTemplateTypes.length === 0 || isSavingBlock
              }
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {isSavingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSavingBlock ? t('blockSaving') : t('blockSave')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
