'use client';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { Download, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { previewCommunicationTemplateEmailAction } from '@/actions/templates/mutations/preview-communication-template-email';
import { sendCommunicationTemplateEmailAction } from '@/actions/templates/mutations/send-communication-template-email';
import { getLenderQuickActionTemplatesAction } from '@/actions/templates/queries/get-lender-quick-action-templates';
import { getQuickActionTemplatesAction } from '@/actions/templates/queries/get-quick-action-templates';
import {
  getLenderSampleLenderYearsAction,
  getSampleLenderYearsAction,
} from '@/actions/templates/queries/get-template-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
   * Lender portal: public DOCUMENT templates only (same loan card as managers, no e-mail).
   * Requires `loanId`.
   */
  lenderSelfService?: boolean;
  /**
   * `default`: outline buttons with optional label on sm+ (lender header).
   * `toolbar`: ghost icon buttons `h-8 w-8` (loan card toolbar, next to edit/delete).
   * `compact`: ghost icon buttons `h-7 w-7` (transaction rows).
   */
  density?: 'default' | 'compact' | 'toolbar';
  /**
   * Single … menu (e.g. loan transaction rows): templates as items + optional delete.
   * When set, `density` is ignored.
   */
  rowMenu?: {
    showDelete: boolean;
    onDelete: () => void;
  };
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

type EmailPreviewPayload = {
  templateName: string;
  sendInput: {
    templateId: string;
    projectId: string;
    lenderId?: string;
    loanId?: string;
    transactionId?: string;
    year?: number;
  };
  to: string;
  subject: string;
  html: string;
};

export function TemplateQuickActions({
  projectId,
  mode,
  lenderId,
  loanId,
  transactionId,
  density = 'default',
  lenderSelfService = false,
  rowMenu,
}: TemplateQuickActionsProps) {
  const t = useTranslations('dashboard.lenders.templateQuickActions');
  const commonT = useTranslations('common');
  const dataTableT = useTranslations('dataTable');
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pendingYearly, setPendingYearly] = useState<PendingYearly | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreviewPayload | null>(null);

  const managerDatasets = datasetsForMode(mode);
  const datasets: TemplateDataset[] = lenderSelfService ? ['LOAN', 'LENDER_YEARLY'] : [...managerDatasets];

  const { data: templates = [], isLoading } = useQuery({
    queryKey: lenderSelfService
      ? ['lender-quick-action-templates', projectId, loanId]
      : ['quick-action-templates', projectId, datasets.join(',')],
    queryFn: async () => {
      if (lenderSelfService) {
        if (!loanId) return [];
        const result = await getLenderQuickActionTemplatesAction({ projectId, loanId });
        if (result?.serverError) {
          return [];
        }
        return result.data?.templates ?? [];
      }
      const result = await getQuickActionTemplatesAction({ projectId, datasets });
      if (result?.serverError) {
        return [];
      }
      return result.data?.templates ?? [];
    },
    enabled: !!projectId && (lenderSelfService ? !!loanId : managerDatasets.length > 0),
  });

  const docTemplates = templates.filter((tpl) => tpl.type === 'DOCUMENT');
  const emailTemplates = lenderSelfService ? [] : templates.filter((tpl) => tpl.type === 'EMAIL');

  const { data: lenderYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: lenderSelfService ? ['lender-lender-sample-years', lenderId] : ['lender-sample-years', lenderId],
    queryFn: async () => {
      if (!lenderId) return [];
      if (lenderSelfService) {
        const result = await getLenderSampleLenderYearsAction({ lenderId });
        if (result?.serverError) return [];
        return result.data ?? [];
      }
      const result = await getSampleLenderYearsAction({ lenderId });
      if (result?.serverError) return [];
      return result.data ?? [];
    },
    enabled: yearDialogOpen && !!lenderId,
  });

  const { executeAsync: sendEmail, isExecuting: sending } = useAction(sendCommunicationTemplateEmailAction);
  const { executeAsync: loadEmailPreview, isExecuting: previewLoading } = useAction(
    previewCommunicationTemplateEmailAction,
  );

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

  async function openEmailPreview(template: QuickTemplateRow, year?: number) {
    setEmailPreviewOpen(true);
    setEmailPreview(null);
    const result = await loadEmailPreview({
      templateId: template.id,
      projectId,
      lenderId,
      loanId,
      transactionId,
      year,
    });
    if (result?.serverError) {
      toast.error(result.serverError);
      setEmailPreviewOpen(false);
      return;
    }
    if (result?.validationErrors) {
      setEmailPreviewOpen(false);
      return;
    }
    const data = result.data;
    if (!data) {
      setEmailPreviewOpen(false);
      return;
    }
    setEmailPreview({
      templateName: template.name,
      sendInput: {
        templateId: template.id,
        projectId,
        lenderId,
        loanId,
        transactionId,
        year,
      },
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
  }

  async function confirmSendEmail() {
    if (!emailPreview) return;
    const result = await sendEmail(emailPreview.sendInput);
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    if (result?.validationErrors) {
      return;
    }
    toast.success(t('emailSent'));
    setEmailPreviewOpen(false);
    setEmailPreview(null);
  }

  function handlePickTemplate(template: QuickTemplateRow, action: 'download' | 'email') {
    if (template.dataset === 'LENDER_YEARLY') {
      startYearlyFlow({ template, action: lenderSelfService ? 'download' : action });
      return;
    }
    if (action === 'download') {
      window.open(buildDownloadHref(template), '_blank', 'noopener,noreferrer');
      return;
    }
    void openEmailPreview(template);
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
    const tpl = template;
    const yr = selectedYear;
    setYearDialogOpen(false);
    setPendingYearly(null);
    await openEmailPreview(tpl, yr);
  }

  const emailActionBusy = sending || previewLoading;

  if (lenderSelfService && !loanId) {
    return null;
  }

  if (rowMenu) {
    const hasTemplates = docTemplates.length > 0 || emailTemplates.length > 0;
    const showTrigger = rowMenu.showDelete || hasTemplates || isLoading;
    if (!showTrigger) {
      return null;
    }

    const showLoadingPlaceholder = isLoading && !hasTemplates;
    const showSeparatorBeforeDelete = rowMenu.showDelete && (hasTemplates || showLoadingPlaceholder);

    return (
      <>
        <DropdownMenu modal>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={dataTableT('rowActions')}
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="z-[200] max-h-80 overflow-y-auto"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {showLoadingPlaceholder ? (
              <DropdownMenuItem disabled>{commonT('ui.status.loading')}</DropdownMenuItem>
            ) : (
              <>
                {docTemplates.map((tpl) => (
                  <DropdownMenuItem
                    key={`dl-${tpl.id}`}
                    disabled={sending}
                    onSelect={() => handlePickTemplate(tpl, 'download')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {tpl.name}
                  </DropdownMenuItem>
                ))}
                {docTemplates.length > 0 && emailTemplates.length > 0 ? <DropdownMenuSeparator /> : null}
                {emailTemplates.map((tpl) => (
                  <DropdownMenuItem
                    key={`em-${tpl.id}`}
                    disabled={emailActionBusy}
                    onSelect={() => handlePickTemplate(tpl, 'email')}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {tpl.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {showSeparatorBeforeDelete ? <DropdownMenuSeparator /> : null}
            {rowMenu.showDelete ? (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => rowMenu.onDelete()}>
                <Trash2 className="mr-2 h-4 w-4" />
                {commonT('ui.actions.delete')}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

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

        <Dialog
          open={emailPreviewOpen}
          onOpenChange={(open) => {
            setEmailPreviewOpen(open);
            if (!open) setEmailPreview(null);
          }}
        >
          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t('emailPreviewTitle')}</DialogTitle>
              {emailPreview ? (
                <p className="text-sm font-medium text-foreground">{emailPreview.templateName}</p>
              ) : null}
            </DialogHeader>
            {previewLoading || !emailPreview ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{commonT('ui.status.loading')}</div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                <div className="shrink-0 space-y-2 text-sm">
                  <div className="break-all">
                    <span className="font-medium text-muted-foreground">{t('emailPreviewTo')}</span>{' '}
                    {emailPreview.to}
                  </div>
                  <div className="break-words">
                    <span className="font-medium text-muted-foreground">{t('emailPreviewSubject')}</span>{' '}
                    {emailPreview.subject}
                  </div>
                </div>
                <div className="min-h-[200px] flex-1 overflow-hidden rounded-md border bg-muted/30">
                  <iframe
                    title={t('emailPreviewTitle')}
                    srcDoc={emailPreview.html}
                    className="block h-[min(50vh,420px)] w-full border-0 bg-white"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmailPreviewOpen(false);
                  setEmailPreview(null);
                }}
                disabled={sending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => void confirmSendEmail()}
                disabled={!emailPreview || sending || previewLoading}
              >
                {t('sendEmail')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isLoading || (docTemplates.length === 0 && emailTemplates.length === 0)) {
    return null;
  }

  const triggerClass = density === 'compact' ? 'h-7 w-7' : density === 'toolbar' ? 'h-8 w-8' : 'h-9 px-3 sm:px-3';

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
                  disabled={emailActionBusy}
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
            <Button type="button" onClick={() => void confirmYearly()} disabled={selectedYear == null || yearsLoading}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={emailPreviewOpen}
        onOpenChange={(open) => {
          setEmailPreviewOpen(open);
          if (!open) setEmailPreview(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('emailPreviewTitle')}</DialogTitle>
            {emailPreview ? (
              <p className="text-sm font-medium text-foreground">{emailPreview.templateName}</p>
            ) : null}
          </DialogHeader>
          {previewLoading || !emailPreview ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{commonT('ui.status.loading')}</div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="shrink-0 space-y-2 text-sm">
                <div className="break-all">
                  <span className="font-medium text-muted-foreground">{t('emailPreviewTo')}</span>{' '}
                  {emailPreview.to}
                </div>
                <div className="break-words">
                  <span className="font-medium text-muted-foreground">{t('emailPreviewSubject')}</span>{' '}
                  {emailPreview.subject}
                </div>
              </div>
              <div className="min-h-[200px] flex-1 overflow-hidden rounded-md border bg-muted/30">
                <iframe
                  title={t('emailPreviewTitle')}
                  srcDoc={emailPreview.html}
                  className="block h-[min(50vh,420px)] w-full border-0 bg-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEmailPreviewOpen(false);
                setEmailPreview(null);
              }}
              disabled={sending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSendEmail()}
              disabled={!emailPreview || sending || previewLoading}
            >
              {t('sendEmail')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
