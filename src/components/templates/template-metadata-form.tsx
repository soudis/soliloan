'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { TemplateDataset, TemplateType } from '@prisma/client';
import { TemplateDataset as TemplateDatasetEnum } from '@prisma/client';
import { Loader2, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Control, type FieldValues, type Path, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createGlobalTemplateAction, createTemplateAction } from '@/actions/templates/mutations/create-template';
import { updateTemplateAction } from '@/actions/templates/mutations/update-template';
import type { MergeTagConfig, MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { getMergeTagConfigAction } from '@/actions/templates/queries/get-merge-tags';
import { getTemplatesAction } from '@/actions/templates/queries/get-templates';
import { MergeTagDropdown } from '@/components/templates/merge-tag-dropdown';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { type CreateTemplateFormData, createTemplateSchema } from '@/lib/schemas/templates';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';
import type { GlobalTemplateListItem } from '@/types/templates';

const NONE_VALUE = '__none__';

const systemSubjectSchema = z.object({
  subjectOrFilename: z.string().max(500).nullable().optional(),
});

const editMetadataSchema = z.object({
  name: z.string().min(1, 'error.template.nameRequired').max(100),
  description: z.string().max(500).nullable().optional(),
  subjectOrFilename: z.string().max(500).nullable().optional(),
});

export type TemplateMetadataInitial = {
  id: string;
  name: string;
  description: string | null;
  type: TemplateType;
  dataset: TemplateDataset;
  subjectOrFilename: string | null;
  isSystem: boolean;
};

type CreateProps = {
  projectId?: string;
  isAdmin?: boolean;
  onCreated?: (id: string) => void;
};

/** Form body for “new template” dialog (wrapped by `TemplateDialog`). */
export function TemplateCreateFormContent({ projectId, isAdmin, onCreated }: CreateProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const currentProjectId = useProjectId();
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplateListItem[]>([]);

  const isProjectLevel = !!projectId;

  useEffect(() => {
    if (!isProjectLevel) return;
    getTemplatesAction({ isGlobal: true, isSystem: false }).then((result) => {
      setGlobalTemplates((result?.data?.templates ?? []) as GlobalTemplateListItem[]);
    });
  }, [isProjectLevel]);

  const form = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: '',
      description: null,
      subjectOrFilename: null,
      type: 'EMAIL',
      dataset: 'LENDER',
      projectId,
      isGlobal: Boolean(isAdmin) && !projectId,
      designJson: {},
      sourceTemplateId: undefined,
    },
  });

  const watchedDataset = form.watch('dataset');
  const watchedType = form.watch('type');

  const filteredGlobalTemplates = globalTemplates.filter(
    (tpl) => tpl.dataset === watchedDataset && tpl.type === watchedType,
  );

  const { executeAsync: createTemplate, isExecuting: isCreating } = useAction(createTemplateAction);
  const { executeAsync: createGlobalTemplate, isExecuting: isCreatingGlobal } = useAction(createGlobalTemplateAction);

  const isLoading = isCreating || isCreatingGlobal;

  const onSubmit = async (data: CreateTemplateFormData) => {
    let result:
      | Awaited<ReturnType<typeof createGlobalTemplateAction>>
      | Awaited<ReturnType<typeof createTemplateAction>>;

    if (isAdmin && !projectId) {
      result = await createGlobalTemplate({
        name: data.name,
        description: data.description,
        subjectOrFilename: data.subjectOrFilename,
        type: data.type,
        dataset: data.dataset,
        designJson: data.designJson,
      });
    } else {
      result = await createTemplate({
        ...data,
        sourceTemplateId: data.sourceTemplateId || undefined,
        projectId,
      });
    }

    if (result?.serverError) {
      toast.error(result.serverError);
    } else if (result?.data?.id) {
      toast.success(t('dialog.created'));
      onCreated?.(result.data.id);

      if (isAdmin && !projectId) {
        router.push(`/admin/templates/${result.data.id}`);
      } else if (currentProjectId) {
        router.push(`/configuration/templates/${result.data.id}`);
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogDescription>{t('dialog.description')}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('dialog.fields.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('dialog.fields.descriptionPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.type')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('dialog.fields.typePlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EMAIL">{t('types.email')}</SelectItem>
                    <SelectItem value="DOCUMENT">{t('types.document')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.dataset')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('dialog.fields.datasetPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TemplateDatasetEnum).map((dataset) => (
                      <SelectItem key={dataset} value={dataset}>
                        {getDatasetDisplayName(dataset)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubjectOrFilenameField
            control={form.control}
            dataset={watchedDataset}
            projectId={projectId}
            templateType={watchedType}
          />

          {isProjectLevel && filteredGlobalTemplates.length > 0 && (
            <FormField
              control={form.control}
              name="sourceTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.fields.sourceTemplate')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === NONE_VALUE ? undefined : v)}
                    value={field.value ?? NONE_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialog.fields.sourceTemplatePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t('dialog.fields.sourceTemplateNone')}</SelectItem>
                      {filteredGlobalTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function SubjectOrFilenameField<TFieldValues extends FieldValues & { subjectOrFilename?: string | null }>({
  control,
  dataset,
  projectId,
  templateType,
}: {
  control: Control<TFieldValues>;
  dataset: TemplateDataset;
  projectId?: string;
  templateType: TemplateType;
}) {
  const t = useTranslations('templates');
  const [mergeTagConfig, setMergeTagConfig] = useState<MergeTagConfig | null>(null);
  const [mergeDropdownOpen, setMergeDropdownOpen] = useState(false);
  const [mergeDropdownPos, setMergeDropdownPos] = useState({ top: 0, left: 0 });
  const mergeTagTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMergeTagConfigAction(dataset, projectId, templateType).then((config) => {
      if (!cancelled) {
        setMergeTagConfig(config);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dataset, projectId, templateType]);

  const label = templateType === 'EMAIL' ? t('dialog.fields.subjectTemplate') : t('dialog.fields.filenameTemplate');
  const placeholder =
    templateType === 'EMAIL'
      ? t('dialog.fields.subjectTemplatePlaceholder')
      : t('dialog.fields.filenameTemplatePlaceholder');

  return (
    <FormField
      control={control}
      name={'subjectOrFilename' as Path<TFieldValues>}
      render={({ field }) => {
        const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
          const tagValue = 'startTag' in item ? item.startTag : item.value;
          const cur = field.value ?? '';
          field.onChange(cur ? `${cur} ${tagValue}` : tagValue);
          setMergeDropdownOpen(false);
        };

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  className="flex-1"
                  placeholder={placeholder}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                />
              </FormControl>
              <div ref={mergeTagTriggerRef} className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!mergeTagConfig}
                  title={t('dialog.fields.insertMergeTag')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    const rect = mergeTagTriggerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setMergeDropdownPos({ top: rect.bottom + 5, left: Math.max(8, rect.left - 220) });
                      setMergeDropdownOpen(true);
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('dialog.fields.mergeTagsHint')}</p>
            <FormMessage />
            {mergeTagConfig && (
              <MergeTagDropdown
                isOpen={mergeDropdownOpen}
                onClose={() => setMergeDropdownOpen(false)}
                onSelect={handleMergeTagSelect}
                config={mergeTagConfig}
                position={mergeDropdownPos}
              />
            )}
          </FormItem>
        );
      }}
    />
  );
}

type SettingsFormProps = {
  initial: TemplateMetadataInitial;
  systemOnly: boolean;
  onSaved: () => void;
  /** Project for merge-tag config (additional fields); falls back to template project when omitted. */
  mergeTagProjectId?: string;
};

/** Settings / edit metadata: system templates → subject/filename only; others → name, description, subject/filename. */
export function TemplateSettingsFormContent({ initial, systemOnly, onSaved, mergeTagProjectId }: SettingsFormProps) {
  const t = useTranslations('templates');
  const fullDefaults = useMemo(
    () => ({
      name: initial.name,
      description: initial.description,
      subjectOrFilename: initial.subjectOrFilename ?? null,
    }),
    [initial],
  );

  const systemForm = useForm<z.infer<typeof systemSubjectSchema>>({
    resolver: zodResolver(systemSubjectSchema),
    defaultValues: { subjectOrFilename: initial.subjectOrFilename ?? null },
  });

  const editForm = useForm<z.infer<typeof editMetadataSchema>>({
    resolver: zodResolver(editMetadataSchema),
    defaultValues: fullDefaults,
  });

  useEffect(() => {
    systemForm.reset({ subjectOrFilename: initial.subjectOrFilename ?? null });
  }, [initial.subjectOrFilename, systemForm]);

  useEffect(() => {
    editForm.reset(fullDefaults);
  }, [fullDefaults, editForm]);

  const { executeAsync: updateTemplate, isExecuting } = useAction(updateTemplateAction);

  const saveSystem = async (data: z.infer<typeof systemSubjectSchema>) => {
    const result = await updateTemplate({
      templateId: initial.id,
      subjectOrFilename: data.subjectOrFilename ?? null,
    });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('dialog.settingsSaved'));
      onSaved();
    }
  };

  const saveFull = async (data: z.infer<typeof editMetadataSchema>) => {
    const result = await updateTemplate({
      templateId: initial.id,
      name: data.name,
      description: data.description,
      subjectOrFilename: data.subjectOrFilename ?? null,
    });
    if (result?.serverError) {
      toast.error(result.serverError);
    } else {
      toast.success(t('dialog.settingsSaved'));
      onSaved();
    }
  };

  if (systemOnly) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t('dialog.settingsTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.settingsDescriptionSystem')}</DialogDescription>
        </DialogHeader>
        <Form {...systemForm}>
          <form onSubmit={systemForm.handleSubmit(saveSystem)} className="space-y-4">
            <SubjectOrFilenameField
              control={systemForm.control}
              dataset={initial.dataset}
              projectId={mergeTagProjectId}
              templateType={initial.type}
            />
            <DialogFooter>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('dialog.saveSettings')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('dialog.settingsTitle')}</DialogTitle>
        <DialogDescription>{t('dialog.settingsDescription')}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground border rounded-md p-2 mb-2">
        <span>
          {t('dialog.fields.type')}: {initial.type === 'EMAIL' ? t('types.email') : t('types.document')}
        </span>
        <span>·</span>
        <span>
          {t('dialog.fields.dataset')}: {getDatasetDisplayName(initial.dataset)}
        </span>
      </div>
      <Form {...editForm}>
        <form onSubmit={editForm.handleSubmit(saveFull)} className="space-y-4">
          <FormField
            control={editForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('dialog.fields.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dialog.fields.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('dialog.fields.descriptionPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SubjectOrFilenameField
            control={editForm.control}
            dataset={initial.dataset}
            projectId={mergeTagProjectId}
            templateType={initial.type}
          />
          <DialogFooter>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dialog.saveSettings')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
