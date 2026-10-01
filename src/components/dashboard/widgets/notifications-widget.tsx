'use client';

import { AlertTriangle, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { WidgetResultUnavailable } from '@/components/dashboard/widgets/widget-result-unavailable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { Link } from '@/i18n/navigation';
import {
  type MissingLenderField,
  type NotificationLine,
  REQUIRED_FIELDS_PAGE_SIZE,
} from '@/lib/dashboard/notifications/compute-notifications';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseNotificationsConfig } from '@/types/dashboard-widgets/notifications';

function missingFieldLabel(field: MissingLenderField, t: (key: string) => string): string {
  if (field.kind === 'additional') {
    return field.name;
  }
  return t(`missingFields.${field.kind}`);
}

function KindHeading({ title, count }: { title: string; count: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="font-medium">{title}</span>
      <Badge variant="secondary" className="shrink-0" aria-hidden>
        {count}
      </Badge>
    </span>
  );
}

function RequiredFieldsLine({
  line,
  title,
  sentence,
}: {
  line: Extract<NotificationLine, { kind: 'requiredFields' }>;
  title: string;
  sentence: string;
}) {
  const t = useTranslations('dashboard.widgets.notifications');
  const tTable = useTranslations('common.ui.table');
  const [open, setOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(line.lenders.length / REQUIRED_FIELDS_PAGE_SIZE));
  const page = Math.min(pageIndex, pageCount - 1);
  const pageLenders = line.lenders.slice(page * REQUIRED_FIELDS_PAGE_SIZE, (page + 1) * REQUIRED_FIELDS_PAGE_SIZE);

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <KindHeading title={title} count={line.count} />
          <span className="mt-0.5 block text-sm text-muted-foreground">{sentence}</span>
        </span>
        <ChevronDown
          className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-1 space-y-1 pl-9">
          <ul className="space-y-1">
            {pageLenders.map((lender) => (
              <li key={lender.id}>
                <Link
                  href={lender.href}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{lender.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {lender.missing.map((field) => missingFieldLabel(field, t)).join(', ')}
                    </span>
                  </span>
                  <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-2 px-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  setPageIndex(page - 1);
                }}
              >
                {tTable('previous')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('page', { page: page + 1, pages: pageCount })}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  setPageIndex(page + 1);
                }}
              >
                {tTable('next')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function NotificationsWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.notifications');
  const tKinds = useTranslations('dashboard.customizer.notifications.kinds');
  const computed = useComputedWidgetResult(widget);
  const lines = useMemo(() => (computed?.type === 'notifications' ? computed.lines : null), [computed]);
  const repaySoonDays = parseNotificationsConfig(widget.config).repaySoonDays;

  const titleFor = (line: NotificationLine) =>
    line.kind === 'openInterest' ? `${tKinds('openInterest')} ${line.year}` : tKinds(line.kind);

  const sentenceFor = (line: NotificationLine) => {
    if (line.kind === 'openInterest') {
      return t('lines.openInterest', { year: line.year, count: line.count });
    }
    if (line.kind === 'repaySoon') {
      return t('lines.repaySoon', { count: line.count, days: repaySoonDays });
    }
    return t(`lines.${line.kind}`, { count: line.count });
  };

  if (!computed) {
    return <WidgetResultUnavailable />;
  }
  if (!lines || lines.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="flex flex-col">
      {lines.map((line) =>
        line.kind === 'requiredFields' ? (
          <RequiredFieldsLine key={line.id} line={line} title={titleFor(line)} sentence={sentenceFor(line)} />
        ) : (
          <li key={line.id}>
            <Link
              href={line.href}
              className="flex items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
              onClick={(event) => event.stopPropagation()}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <KindHeading title={titleFor(line)} count={line.count} />
                <span className="mt-0.5 block text-sm text-muted-foreground">{sentenceFor(line)}</span>
              </span>
              <LinkIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
