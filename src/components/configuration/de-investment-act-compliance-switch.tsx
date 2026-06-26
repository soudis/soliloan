'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { disableDeInvestmentActComplianceAction, enableDeInvestmentActComplianceAction } from '@/actions/projects';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form';
import { InfoText } from '@/components/ui/info-text';
import { Link, useRouter } from '@/i18n/navigation';
import { Switch } from '../ui/switch';

type DialogMode = 'enable' | 'disable';
type DialogStep = 'confirm' | 'success';

interface DeInvestmentActComplianceSwitchProps {
  projectId: string;
  germanLoansCount: number;
  className?: string;
}

export function DeInvestmentActComplianceSwitch({
  projectId,
  germanLoansCount,
  className,
}: DeInvestmentActComplianceSwitchProps) {
  const t = useTranslations('dashboard.configuration.form.deInvestmentActCompliance');
  const form = useFormContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('enable');
  const [dialogStep, setDialogStep] = useState<DialogStep>('confirm');
  const [createdCount, setCreatedCount] = useState(0);

  const { executeAsync: enableModule, isExecuting: isEnabling } = useAction(enableDeInvestmentActComplianceAction);
  const { executeAsync: disableModule, isExecuting: isDisabling } = useAction(disableDeInvestmentActComplianceAction);
  const isExecuting = isEnabling || isDisabling;

  const finishActivation = async (investmentTypesCreated: number) => {
    form.setValue('deInvestmentActCompliance', true, { shouldDirty: true });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    router.refresh();

    if (germanLoansCount === 0) {
      toast.success(t('enabledWithoutLoans'));
      return;
    }

    setCreatedCount(investmentTypesCreated);
    setDialogStep('success');
    setDialogOpen(true);
  };

  const runActivation = async () => {
    const result = await enableModule({ projectId });
    if (result?.serverError) {
      toast.error(result.serverError);
      return false;
    }
    if (result?.validationErrors) {
      return false;
    }

    await finishActivation(result?.data?.investmentTypesCreated ?? 0);
    return true;
  };

  const runDeactivation = async () => {
    const result = await disableModule({ projectId });
    if (result?.serverError) {
      toast.error(result.serverError);
      return false;
    }
    if (result?.validationErrors) {
      return false;
    }

    form.setValue('deInvestmentActCompliance', false, { shouldDirty: true });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    router.refresh();
    toast.success(t('disabled'));
    return true;
  };

  const handleCheckedChange = async (checked: boolean) => {
    const currentValue = form.getValues('deInvestmentActCompliance');

    if (!checked) {
      if (!currentValue) {
        return;
      }
      setDialogMode('disable');
      setDialogStep('confirm');
      setDialogOpen(true);
      return;
    }

    if (currentValue) {
      return;
    }

    if (germanLoansCount === 0) {
      await runActivation();
      return;
    }

    setDialogMode('enable');
    setDialogStep('confirm');
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && dialogStep === 'confirm' && dialogMode === 'enable') {
      form.setValue('deInvestmentActCompliance', false, { shouldDirty: false });
    }
    setDialogOpen(open);
    if (!open) {
      setDialogMode('enable');
      setDialogStep('confirm');
      setCreatedCount(0);
    }
  };

  const handleConfirmActivate = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await runActivation();
  };

  const handleConfirmDeactivate = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const success = await runDeactivation();
    if (success) {
      setDialogOpen(false);
    }
  };

  return (
    <>
      <FormFieldWrapper
        control={form.control}
        name="deInvestmentActCompliance"
        render={({ field }) => (
          <FormItem className={className}>
            <div className="flex items-center justify-between gap-4">
              <FormLabel>{t('label')}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value && field.value !== 'false'}
                  onCheckedChange={handleCheckedChange}
                  disabled={isExecuting}
                />
              </FormControl>
            </div>
            <FormDescription className="text-sm text-muted-foreground/80">
              <InfoText t={t} messageKey="hint" externalLinks={deInvestmentActComplianceLinks} />
            </FormDescription>
          </FormItem>
        )}
      />

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          {dialogStep === 'confirm' && dialogMode === 'disable' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('disableDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription className="text-left whitespace-pre-line">
                  {t('disableDialog.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isExecuting}>{t('disableDialog.cancel')}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleConfirmDeactivate} disabled={isExecuting}>
                  {isExecuting ? t('disableDialog.deactivating') : t('disableDialog.deactivate')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : dialogStep === 'confirm' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('enableDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription className="text-left whitespace-pre-line">
                  {t('enableDialog.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isExecuting}>{t('enableDialog.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmActivate} disabled={isExecuting}>
                  {isExecuting ? t('enableDialog.activating') : t('enableDialog.activate')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('enableDialog.successTitle')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-left text-sm text-muted-foreground">
                    <p>{t('enableDialog.successCreated', { count: createdCount })}</p>
                    {createdCount > 0 && <p>{t('enableDialog.successLimitationWarning')}</p>}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('enableDialog.close')}</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Link
                    href={`/investment-types?projectId=${projectId}`}
                    className="inline-flex items-center gap-2"
                    onClick={() => setDialogOpen(false)}
                  >
                    <Scale className="h-4 w-4" />
                    {t('enableDialog.viewInvestmentTypes')}
                  </Link>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const deInvestmentActComplianceLinks = ['https://www.gesetze-im-internet.de/vermanlg/__2.html'];
