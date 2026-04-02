'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { addProjectManagerAction } from '@/actions/projects';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useQueryClient } from '@tanstack/react-query';
import { useAction } from 'next-safe-action/hooks';

const addManagerFormSchema = z.object({
  email: z.string().min(1, { message: 'validation.common.required' }).email({ message: 'validation.common.email' }),
});

type AddManagerFormData = z.infer<typeof addManagerFormSchema>;

const defaultValues: AddManagerFormData = {
  email: '',
};

interface AddManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onManagerAdded?: () => void;
}

export function AddManagerDialog({ open, onOpenChange, projectId, onManagerAdded }: AddManagerDialogProps) {
  const t = useTranslations('dashboard.configuration');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();
  const { executeAsync: addManager, isExecuting } = useAction(addProjectManagerAction);

  const form = useForm<AddManagerFormData>({
    resolver: zodResolver(addManagerFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = await addManager({ projectId, email: data.email });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    if (result?.validationErrors) {
      return;
    }
    if (result?.data?.project) {
      toast.success(t('managers.addManagerSuccess'));
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      onManagerAdded?.();
      onOpenChange(false);
      form.reset(defaultValues);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('managers.addManagerDialogTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mt-4">
              <FormField
                name="email"
                label={t('managers.addManagerDialogEmailLabel')}
                placeholder={t('managers.addManagerDialogEmailPlaceholder')}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {t('managers.addManagerSubmit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
