'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { sendNotifyTransactionsAction } from '@/actions/transactions/mutations/notify-transactions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Preview = {
  sample: { html: string; subject: string } | null;
  alreadyNotifiedCount: number;
  missingEmailCount: number;
  realCount: number;
};

type Props = {
  open: boolean;
  projectId: string;
  transactionIds: string[];
  preview: Preview | null;
  onOpenChange: (open: boolean) => void;
};

export function NotifyTransactionsDialog({ open, projectId, transactionIds, preview, onOpenChange }: Props) {
  const t = useTranslations('dashboard.transactions.notify');
  const [resend, setResend] = useState<'yes' | 'no' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsChoice = (preview?.alreadyNotifiedCount ?? 0) > 0;

  const send = async () => {
    if (needsChoice && !resend) {
      toast.error(t('choiceRequired'));
      return;
    }
    setIsSubmitting(true);
    const result = await sendNotifyTransactionsAction({
      projectId,
      transactionIds,
      resendAlreadyNotified: resend === 'yes',
    });
    setIsSubmitting(false);
    if (result?.serverError || !result?.data) {
      toast.error(result?.serverError ?? t('failed', { count: 1 }));
      return;
    }
    if (result.data.sent > 0) toast.success(t('sent', { count: result.data.sent }));
    else toast.message(t('noneSent'));
    if (result.data.failed > 0) toast.error(t('failed', { count: result.data.failed }));
    setResend(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setResend(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {preview?.sample ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t('sample')}</div>
            <div className="text-sm text-muted-foreground">{preview.sample.subject}</div>
            <iframe
              title={preview.sample.subject}
              srcDoc={preview.sample.html}
              className="h-72 w-full rounded-md border bg-white"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noSample')}</p>
        )}
        {preview && preview.alreadyNotifiedCount > 0 ? (
          <div className="space-y-2">
            <p className="text-sm">{t('alreadyNotified', { count: preview.alreadyNotifiedCount })}</p>
            <RadioGroup value={resend ?? ''} onValueChange={(value) => setResend(value as 'yes' | 'no')}>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="no" />
                {t('skipAlready')}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="yes" />
                {t('resend')}
              </Label>
            </RadioGroup>
          </div>
        ) : null}
        {preview && preview.missingEmailCount > 0 ? (
          <p className="text-sm text-muted-foreground">{t('missingEmail', { count: preview.missingEmailCount })}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" disabled={isSubmitting || (needsChoice && !resend)} onClick={() => void send()}>
            {t('action')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
