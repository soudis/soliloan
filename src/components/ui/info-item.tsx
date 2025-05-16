import { Copy, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import { QRCodeDialog } from './qr-code-dialog';

interface InfoItemProps {
  label: string;
  value?: string | number | React.ReactNode;
  className?: string;
  emptyMessage?: string;
  showCopyButton?: boolean;
  showQrButton?: boolean;
  recipientName?: string;
  qrValue?: string;
  copyValue?: string;
}

export function InfoItem({
  label,
  value,
  className,
  emptyMessage = 'Not provided',
  showCopyButton = false,
  showQrButton = false,
  recipientName,
  qrValue,
  copyValue,
}: InfoItemProps) {
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const t = useTranslations('common');

  const handleCopy = () => {
    const textToCopy = copyValue ?? (typeof value === 'string' ? value : undefined);
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(t('clipboard.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('grid grid-cols-1 gap-1', className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      {value ? (
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium">{value}</div>
          <div className="flex items-center space-x-2">
            {showCopyButton && (typeof value === 'string' || copyValue) && (
              <button
                onClick={handleCopy}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                title={copied ? t('clipboard.copied') : t('clipboard.copy')}
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {showQrButton && qrValue && recipientName && (
              <>
                <button
                  onClick={() => setQrDialogOpen(true)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  title={t('qrCode.show')}
                >
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </button>
                <QRCodeDialog
                  open={qrDialogOpen}
                  onOpenChange={setQrDialogOpen}
                  iban={qrValue}
                  recipientName={recipientName}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground italic">{emptyMessage}</div>
      )}
    </div>
  );
}
