import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox } from '@/components/form/form-checkbox';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

const saveViewSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean(),
  saveForProject: z.boolean(),
  showInSidebar: z.boolean(),
});

type SaveViewFormData = z.infer<typeof saveViewSchema>;

interface SaveViewDialogProps {
  disabled?: boolean;
  onSave: (name: string, isDefault: boolean, saveForProject: boolean, showInSidebar: boolean) => Promise<void>;
  isLoading?: boolean;
  allowSidebar?: boolean;
  hasProject?: boolean;
  /** No icon trigger — opened from parent (e.g. save menu). */
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaveViewDialog({
  onSave,
  isLoading = false,
  disabled = false,
  allowSidebar = false,
  hasProject = false,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SaveViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const t = useTranslations('views');

  const form = useForm<SaveViewFormData>({
    resolver: zodResolver(saveViewSchema),
    defaultValues: {
      name: '',
      isDefault: false,
      saveForProject: false,
      showInSidebar: false,
    },
  });

  const handleSubmit = async (values: SaveViewFormData) => {
    const showInSidebar = allowSidebar ? values.showInSidebar : false;
    const saveForProject = hasProject ? values.saveForProject : false;
    await onSave(values.name, values.isDefault, saveForProject, showInSidebar);
    if (hideTrigger) {
      controlledOnOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
    form.reset();
  };

  const formBody = (
    <>
      <DialogHeader>
        <DialogTitle>{t('saveView.title')}</DialogTitle>
        <DialogDescription>{t('saveView.description')}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={(event) => {
            event.stopPropagation();
            form.handleSubmit(handleSubmit)(event);
          }}
          className="space-y-4"
        >
          <FormField name="name" label={t('saveView.name')} placeholder={t('saveView.namePlaceholder')} required />
          <FormCheckbox name="isDefault" label={t('saveView.isDefault')} />
          <FormCheckbox
            name="saveForProject"
            label={t('saveView.saveForProject')}
            hint={!hasProject ? t('saveView.saveForProjectNeedProject') : t('saveView.saveForProjectHint')}
            disabled={!hasProject}
          />
          {allowSidebar ? (
            <FormCheckbox
              name="showInSidebar"
              label={t('saveView.showInSidebar')}
              hint={t('saveView.showInSidebarHint')}
            />
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('saveView.saving') : t('saveView.save')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );

  if (hideTrigger) {
    return (
      <Dialog
        open={controlledOpen ?? false}
        onOpenChange={(v) => {
          controlledOnOpenChange?.(v);
          if (!v) form.reset();
        }}
      >
        <DialogContent className="sm:max-w-[425px]">{formBody}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={internalOpen}
      onOpenChange={(v) => {
        setInternalOpen(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title={t('saveView.title')} disabled={disabled}>
          <Save className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">{formBody}</DialogContent>
    </Dialog>
  );
}
