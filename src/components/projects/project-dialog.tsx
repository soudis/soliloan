'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createProjectAction } from '@/actions/projects';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useRouter } from '@/i18n/navigation';
import type { ProjectFormData } from '@/lib/schemas/project';
import { projectFormSchema } from '@/lib/schemas/project';
import { useProjects } from '@/store/projects-store';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: ProjectFormData = {
  name: '',
};

export function ProjectDialog({ open, onOpenChange }: ProjectDialogProps) {
  const t = useTranslations('dashboard.projects');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setSelectedProject } = useProjects();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createProjectAction(data);
      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation error');
      }
      if (result?.data) {
        toast.success(t('create.success'));
        const createdProject = result.data;

        // Refetch projects and wait for completion, then set selected project
        await queryClient.refetchQueries({ queryKey: ['projects'] });

        // Navigate to the new project's configuration
        router.push(`/${createdProject.id}/configuration`);

        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(t('create.error'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mt-4">
              <FormField name="name" label={t('create.name')} placeholder={t('create.namePlaceholder')} required />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
