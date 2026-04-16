'use client';

import { Loader2, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { duplicateTemplateAction } from '@/actions/templates/mutations/duplicate-template';
import { getTemplatesAction } from '@/actions/templates/queries/get-templates';
import { Badge } from '@/components/ui/badge';
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
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { STARTER_TEMPLATE_SYSTEM_KEYS } from '@/lib/templates/starter-template-system-keys';
import type { GlobalTemplateListItem } from '@/types/templates';

interface SystemTemplateDialogProps {
  projectId: string;
}

export function SystemTemplateDialog({ projectId }: SystemTemplateDialogProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const currentProjectId = useProjectId();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<GlobalTemplateListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { executeAsync: duplicateTemplate, isExecuting } = useAction(duplicateTemplateAction);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedId(null);
    getTemplatesAction({ isGlobal: true, isSystem: true })
      .then((result) => {
        const all = result?.data?.templates ?? [];
        const starter = new Set<string>(STARTER_TEMPLATE_SYSTEM_KEYS);
        const filtered = all.filter(
          (tpl) => tpl.dataset !== 'USER' && !(tpl.systemKey != null && starter.has(tpl.systemKey)),
        );
        setTemplates(filtered as GlobalTemplateListItem[]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleCopy = async () => {
    if (!selectedId) return;
    const source = templates.find((tpl) => tpl.id === selectedId);
    if (!source) return;

    const result = await duplicateTemplate({
      id: selectedId,
      name: source.name,
      projectId,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
    } else if (result?.data?.id) {
      toast.success(t('systemDialog.copied'));
      setOpen(false);
      router.push(`/${currentProjectId}/configuration/templates/${result.data.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4 mr-2" />
          {t('systemDialog.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('systemDialog.title')}</DialogTitle>
          <DialogDescription>{t('systemDialog.description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('systemDialog.noTemplates')}</p>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedId(tpl.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                  selectedId === tpl.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tpl.name}</span>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {tpl.type === 'EMAIL' ? t('types.email') : t('types.document')}
                    </Badge>
                  </div>
                </div>
                {tpl.description && <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('systemDialog.cancel')}
          </Button>
          <Button onClick={handleCopy} disabled={!selectedId || isExecuting}>
            {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('systemDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
