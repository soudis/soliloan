'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TemplateCreateFormContent } from '@/components/templates/template-metadata-form';
import { ActionButton } from '@/components/ui/action-button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface TemplateDialogProps {
  projectId?: string;
  isAdmin?: boolean;
  /** Called after create with the new template id (optional for backwards compatibility). */
  onCreated?: (id?: string) => void;
  children?: React.ReactNode;
}

export function TemplateDialog({ projectId, isAdmin, onCreated, children }: TemplateDialogProps) {
  const t = useTranslations('templates');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <ActionButton intent="add" density="header" icon={<Plus className="h-4 w-4" />} label={t('dialog.trigger')} />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <TemplateCreateFormContent
          projectId={projectId}
          isAdmin={isAdmin}
          onCreated={(id) => {
            setOpen(false);
            onCreated?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
