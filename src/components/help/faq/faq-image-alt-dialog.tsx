'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FaqImageAltDialogProps = {
  open: boolean;
  previewSrc: string | null;
  initialAlt: string;
  mode: 'insert' | 'edit';
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (alt: string) => void;
};

export function FaqImageAltDialog({
  open,
  previewSrc,
  initialAlt,
  mode,
  submitting = false,
  onOpenChange,
  onConfirm,
}: FaqImageAltDialogProps) {
  const t = useTranslations('help.editor');
  const tUi = useTranslations('common.ui.actions');
  const [alt, setAlt] = useState(initialAlt);

  useEffect(() => {
    if (open) setAlt(initialAlt);
  }, [open, initialAlt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('imageAltTitle')}</DialogTitle>
          <DialogDescription>{t('imageAltDescription')}</DialogDescription>
        </DialogHeader>
        {previewSrc ? (
          <div className="flex justify-center rounded-md border bg-muted/40 p-3">
            {/* biome-ignore lint/performance/noImgElement: preview uses blob and media URLs */}
            <img src={previewSrc} alt={t('imagePreview')} className="max-h-40 max-w-full rounded object-contain" />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="faq-image-alt">{t('imageAltLabel')}</Label>
          <Input
            id="faq-image-alt"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder={t('imageAltPlaceholder')}
            maxLength={200}
            disabled={submitting}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!submitting) onConfirm(alt.trim());
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            {tUi('cancel')}
          </Button>
          <Button type="button" disabled={submitting} onClick={() => onConfirm(alt.trim())}>
            {mode === 'insert' ? t('imageInsert') : tUi('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
