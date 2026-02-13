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
});

type SaveViewFormData = z.infer<typeof saveViewSchema>;

interface SaveViewDialogProps {
  disabled?: boolean;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function SaveViewDialog({ onSave, isLoading = false, disabled = false }: SaveViewDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('views');

  const form = useForm<SaveViewFormData>({
    resolver: zodResolver(saveViewSchema),
    defaultValues: {
      name: '',
      isDefault: false,
    },
  });

  const handleSubmit = async (values: SaveViewFormData) => {
    await onSave(values.name, values.isDefault);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title={t('saveView.title')} disabled={disabled}>
          <Save className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('saveView.saving') : t('saveView.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
