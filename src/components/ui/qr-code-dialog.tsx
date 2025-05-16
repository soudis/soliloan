'use client';

import { useTranslations } from 'next-intl';
import GiroCode from 'react-girocode';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iban: string;
  bic?: string;
  recipientName: string;
  amount?: number;
  purpose?: string;
}

export function QRCodeDialog({ open, onOpenChange, iban, bic, recipientName, amount, purpose }: QRCodeDialogProps) {
  const t = useTranslations('common.qrCode');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <GiroCode iban={iban} bic={bic} recipient={recipientName} amount={amount} text={purpose} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium">{recipientName}</p>
            <p className="text-sm text-muted-foreground">{iban}</p>
            {bic && <p className="text-sm text-muted-foreground">{bic}</p>}
            {amount && <p className="text-sm font-medium">{amount.toFixed(2)} €</p>}
            {purpose && <p className="text-sm text-muted-foreground">{purpose}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
