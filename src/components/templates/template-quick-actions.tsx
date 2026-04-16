'use client';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getQuickActionTemplatesAction } from '@/actions/templates/queries/get-quick-action-templates';
import { sendCommunicationTemplateEmailAction } from '@/actions/templates/mutations/send-communication-template-email';
import { getSampleLenderYearsAction } from '@/actions/templates/queries/get-template-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildTemplateUseSearchParams } from '@/lib/templates/template-download-query';
import { cn } from '@/lib/utils';

type QuickMode = 'lender' | 'loan' | 'transaction';

function datasetsForMode(mode: QuickMode): Array<'LENDER' | 'LENDER_YEARLY' | 'LOAN' | 'TRANSACTION'> {
  switch (mode) {
    case 'lender':
      return ['LENDER', 'LENDER_YEARLY'];
    case 'loan':
      return ['LOAN'];
    case 'transaction':
      return ['TRANSACTION'];
    default:
      return [];
  }
}

export type TemplateQuickActionsProps = {
  projectId: string;
  mode: QuickMode;
  lenderId: string;
  loanId?: string;
  transactionId?: string;
  /**
   * `default`: outline buttons with optional label on sm+ (lender header).
   * `toolbar`: ghost icon buttons `h-8 w-8` (loan card toolbar, next to edit/delete).
   * `compact`: ghost icon buttons `h-7 w-7` (transaction rows).
   */
  density?: 'default' | 'compact' | 'toolbar';
};

/** Row shape from {@link getQuickActionTemplatesAction} (subset of `CommunicationTemplate`). */
type QuickTemplateRow = {
  id: string;
  name: string;
  dataset: TemplateDataset;
  type: TemplateType;
};

type PendingYearly = {
  template: QuickTemplateRow;
  action: 'download' | 'email';
};

export function TemplateQuickActions({
  projectId,
  mode,
  lenderId,
  loanId,
  transactionId,
  density = 'default',
}: TemplateQuickActionsProps) {
  const t = useTranslations('dashboard.lenders.templateQuickActions');
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pendingYearly, setPendingYearly] = useState<PendingYearly | null>(null);

  const datasets = datasetsForMode(mode);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['quick-action-templates', projectId, datasets.join(',')],
    queryFn: async () => {
      const result = await getQuickActionTemplatesAction({ projectId, datasets });
      if (result?.serverError) {
        return [];
      }
      return result.data?.templates ?? [];
    },
    enabled: !!projectId && datasets.length > 0,
  });

  const docTemplates = templates.filter((tpl) => tpl.type === 'DOCUMENT');
  const emailTemplates = templates.filter((tpl) => tpl.type === 'EMAIL');

  const { data: lenderYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ['lender-sample-years', lenderId],
    queryFn: () => getSampleLenderYearsAction(lenderId),
    enabled: yearDialogOpen && !!lenderId,
  });

  const { executeAsync: sendEmail, isExecuting: sending } = useAction(sendCommunicationTemplateEmailAction);

  const basePayload = {
    projectId,
    lenderId,
    loanId,
    transactionId,
  };

  function buildDownloadHref(template: Pick<QuickTemplateRow, 'id' | 'dataset'>, year?: number) {
    const sp = buildTemplateUseSearchParams(template.dataset, {
      ...basePayload,
      year,
    });
    return `/api/templates/${template.id}/download?${sp.toString()}`;
  }

  function startYearlyFlow(next: PendingYearly) {
    setPendingYearly(next);
    setSelectedYear(null);
    setYearDialogOpen(true);
  }

  useEffect(() => {
    if (!yearDialogOpen || lenderYears.length === 0) return;
    setSelectedYear((y) => (y == null ? lenderYears[0] : y));
  }, [yearDialogOpen, lenderYears]);

  async function runEmail(template: QuickTemplateRow, year?: number) {
    const result = await sendEmail({
      templateId: template.id,
      projectId,
      lenderId,
      loanId,
      transactionId,
      year,
    });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    if (result?.validationErrors) {
      return;
    }
    toast.success(t('emailSent'));
  }

  function handlePickTemplate(template: QuickTemplateRow, action: 'download' | 'email') {
    if (template.dataset === 'LENDER_YEARLY') {
      startYearlyFlow({ template, action });
      return;
    }
    if (action === 'download') {
      window.open(buildDownloadHref(template), '_blank', 'noopener,noreferrer');
      return;
    }
    void runEmail(template);
  }

  async function confirmYearly() {
    if (!pendingYearly || selectedYear == null) return;
    const { template, action } = pendingYearly;
    if (action === 'download') {
      window.open(buildDownloadHref(template, selectedYear), '_blank', 'noopener,noreferrer');
      setYearDialogOpen(false);
      setPendingYearly(null);
      return;
    }
    await runEmail(template, selectedYear);
    setYearDialogOpen(false);
    setPendingYearly(null);
  }

  if (isLoading || (docTemplates.length === 0 && emailTemplates.length === 0)) {
    return null;
  }

  const triggerClass =
    density === 'compact'
      ? 'h-7 w-7'
      : density === 'toolbar'
        ? 'h-8 w-8'
        : 'h-9 px-3 sm:px-3';

  const isIconTrigger = density === 'compact' || density === 'toolbar';
  const iconClassName = density === 'default' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <>
      <div
        className={cn(
          'flex items-center',
          density === 'default' && 'gap-2',
          (density === 'compact' || density === 'toolbar') && 'gap-1',
        )}
      >
        {docTemplates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={isIconTrigger ? 'ghost' : 'outline'}
                size={isIconTrigger ? 'icon' : 'sm'}
                className={triggerClass}
              >
                <Download className={cn('shrink-0', iconClassName)} />
                {!isIconTrigger && <span className="hidden sm:ml-2 sm:inline">{t('download')}</span>}
                {isIconTrigger && <span className="sr-only">{t('download')}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {docTemplates.map((tpl) => (
                <DropdownMenuItem
                  key={`dl-${tpl.id}`}
                  disabled={sending}
                  onSelect={() => handlePickTemplate(tpl, 'download')}
                >
                  {tpl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {emailTemplates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={isIconTrigger ? 'ghost' : 'outline'}
                size={isIconTrigger ? 'icon' : 'sm'}
                className={triggerClass}
              >
                <Mail className={cn('shrink-0', iconClassName)} />
                {!isIconTrigger && <span className="hidden sm:ml-2 sm:inline">{t('email')}</span>}
                {isIconTrigger && <span className="sr-only">{t('email')}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {emailTemplates.map((tpl) => (
                <DropdownMenuItem
                  key={`em-${tpl.id}`}
                  disabled={sending}
                  onSelect={() => handlePickTemplate(tpl, 'email')}
                >
                  {tpl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('yearDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t('yearLabel')}</Label>
            <Select
              value={selectedYear != null ? String(selectedYear) : undefined}
              onValueChange={(v) => setSelectedYear(Number.parseInt(v, 10))}
              disabled={yearsLoading || lenderYears.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('yearPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {lenderYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmYearly()}
              disabled={selectedYear == null || yearsLoading}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
