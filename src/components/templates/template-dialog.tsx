'use client';

import { useRouter } from '@/i18n/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { TemplateDataset, TemplateType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createGlobalTemplateAction, createTemplateAction } from '@/actions/templates/mutations/create-template';
import { type CreateTemplateFormData, createTemplateSchema } from '@/lib/schemas/templates';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';

interface TemplateDialogProps {
  projectId?: string;
  isAdmin?: boolean;
  onCreated?: () => void;
  children?: React.ReactNode;
}

export function TemplateDialog({ projectId, isAdmin, onCreated, children }: TemplateDialogProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: '',
      description: null,
      type: 'EMAIL',
      dataset: 'LENDER',
      projectId: projectId,
      isGlobal: isAdmin && !projectId,
      designJson: {},
    },
  });

  const { executeAsync: createTemplate, isExecuting: isCreating } = useAction(createTemplateAction);
  const { executeAsync: createGlobalTemplate, isExecuting: isCreatingGlobal } = useAction(createGlobalTemplateAction);

  const isLoading = isCreating || isCreatingGlobal;

  const onSubmit = async (data: CreateTemplateFormData) => {
    let result;

    if (isAdmin && !projectId) {
      // Creating global template
      result = await createGlobalTemplate({
        name: data.name,
        description: data.description,
        type: data.type,
        dataset: data.dataset,
        designJson: data.designJson,
      });
    } else {
      // Creating project template
      result = await createTemplate({
        ...data,
        projectId: projectId!,
      });
    }

    if (result?.serverError) {
      toast.error(result.serverError);
    } else if (result?.data?.id) {
      toast.success(t('dialog.created'));
      setOpen(false);
      form.reset();
      onCreated?.();

      // Navigate to editor
      if (isAdmin && !projectId) {
        router.push(`/admin/templates/${result.data.id}`);
      } else {
        router.push(`/configuration/templates/${result.data.id}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('dialog.trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialog.fields.datasetPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(TemplateDataset).map((dataset) => (
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

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('dialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
