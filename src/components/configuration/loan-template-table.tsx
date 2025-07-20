import { deleteLoanTemplateAction } from '@/actions/projects/mutations/delete-loan-template';
import { markLoanTemplateAsDefaultAction } from '@/actions/projects/mutations/mark-loan-template-default';
import { upsertLoanTemplateAction } from '@/actions/projects/mutations/upsert-loan-template';
import type { LoanTemplate } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { FormControl, FormField, FormItem } from '../ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { LoanTemplateDialog } from './loan-template-dialog';

type Props = {
  configurationId: string;
  loanTemplates: LoanTemplate[];
};

export function LoanTemplateTable({ configurationId, loanTemplates }: Props) {
  const t = useTranslations('dashboard.configuration.form.loanTemplates');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  console.log('openDialog', openDialog);

  const { executeAsync: markLoanTemplateAsDefault } = useAction(markLoanTemplateAsDefaultAction, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('markAsDefaultSuccess'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.toString() ?? commonT('ui.actions.error'));
    },
  });

  const { executeAsync: deleteLoanTemplate } = useAction(deleteLoanTemplateAction, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('deleteSuccess'));
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.toString() ?? commonT('ui.actions.error'));
    },
  });

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead className="w-[50px]">{t('default')}</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loanTemplates
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="cursor-pointer" onClick={() => setOpenDialog(field.id)}>
                  {field.name}
                </TableCell>
                <TableCell className="align-top">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markLoanTemplateAsDefault(field);
                    }}
                    className="text-primary hover:bg-primary/10"
                  >
                    {field.isDefault ? (
                      <Star className="h-4 w-4 text-primary" />
                    ) : (
                      <Star className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="align-top">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLoanTemplate(field);
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                <LoanTemplateDialog
                  configurationId={configurationId}
                  initialValues={field}
                  open={openDialog === field.id}
                  onOpenChange={(o) => {
                    console.log('onOpenChange', o, openDialog, o === true ? field.id : null);
                    setOpenDialog(o === true ? field.id : '');
                  }}
                />
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" onClick={() => setOpenDialog('new')} className="mt-4">
        <PlusCircle className="mr-2 h-4 w-4" />
        {t('addTemplate')}
      </Button>
      <LoanTemplateDialog
        configurationId={configurationId}
        open={openDialog === 'new'}
        onOpenChange={(o) => {
          setOpenDialog(o ? 'new' : null);
        }}
      />
    </div>
  );
}
