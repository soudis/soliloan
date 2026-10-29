'use client';

import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { TransactionPreview, TransactionWarning } from '@/lib/loans/transaction-validation';
import type { Violation } from '@/lib/loans/transaction-ledger';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';

const WARNING_CLASS = 'border-amber-300 bg-amber-50 text-amber-900 [&_[data-slot=alert-description]]:text-amber-900';
const INFO_CLASS = 'border-sky-200 bg-sky-50 text-sky-900 [&_[data-slot=alert-description]]:text-sky-900';

const MODAL = 'dashboard.loans.transactions.modal';

/** Localised sentence for a violated rule: which Zahlung, on which day, and by how much. */
export function useViolationMessage() {
  const t = useTranslations(MODAL);
  const commonT = useTranslations('common');
  const locale = useLocale();
  return (violation: Violation) =>
    t(`errors.${violation.rule}`, {
      type: commonT(`enums.transaction.type.${violation.type}`),
      date: formatDateShort(violation.date, locale),
      value: formatCurrency(violation.value),
      limit: formatCurrency(violation.limit),
    });
}

/** Short reason why a type is not possible on the chosen day (for the type list). */
export function useUnavailableReason(candidateId: string) {
  const t = useTranslations(MODAL);
  return (reason: Violation | undefined) => {
    if (!reason) {
      return undefined;
    }
    return reason.transactionId === candidateId ? t(`unavailable.${reason.rule}`) : t('unavailable.later');
  };
}

export function TransactionStateSummary({ preview, date }: { preview: TransactionPreview; date: Date }) {
  const t = useTranslations(MODAL);
  const locale = useLocale();
  const { summary } = preview;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-card-foreground">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {t('summaryTitle', { date: formatDateShort(date, locale) })}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <SummaryValue label={t('balance')} value={formatCurrency(summary.balance)} />
        <SummaryValue label={t('einlagenstand')} value={formatCurrency(summary.einlagenstand)} />
        <SummaryValue label={t('freeCapacity')} value={formatCurrency(summary.freeCapacity)} />
      </dl>
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({
  icon,
  className,
  title,
  children,
  action,
  destructive,
}: {
  icon: ReactNode;
  className?: string;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  destructive?: boolean;
}) {
  return (
    <Alert variant={destructive ? 'destructive' : 'default'} className={cn(className)}>
      {icon}
      {title ? <AlertTitle className="line-clamp-none">{title}</AlertTitle> : null}
      {children || action ? (
        <AlertDescription>
          {children}
          {action}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}

/**
 * Errors block saving, warnings do not. `onRecalculate` is only offered for the Rückzahlung / Erlassung
 * being edited, whose amount can be set to the Kontostand of its day.
 */
export function TransactionAlerts({
  preview,
  unavailableMessage,
  onRecalculate,
}: {
  preview: TransactionPreview;
  /** Set when the selected type is not possible on the chosen day. */
  unavailableMessage?: string;
  onRecalculate?: () => void;
}) {
  const t = useTranslations(MODAL);
  const commonT = useTranslations('common');
  const locale = useLocale();
  const violationMessage = useViolationMessage();

  const renderWarning = (warning: TransactionWarning, index: number) => {
    switch (warning.kind) {
      case 'FUTURE_DATE':
        return (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<AlertTriangle />}
            className={WARNING_CLASS}
            title={t('warnings.futureTitle')}
          >
            {t('warnings.futureDescription')}
          </Notice>
        );
      case 'CLOSING_DIFFERENCE': {
        const { difference, own } = warning;
        const values = {
          type: commonT(`enums.transaction.type.${difference.type}`),
          date: formatDateShort(difference.date, locale),
          balance: formatCurrency(difference.balance),
          amount: formatCurrency(difference.amount),
          difference: formatCurrency(Math.abs(difference.difference)),
          direction: difference.difference > 0 ? 'higher' : 'lower',
        };
        return own ? (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<AlertTriangle />}
            className={WARNING_CLASS}
            title={t('warnings.closingOwnTitle')}
            action={
              onRecalculate ? (
                <Button type="button" size="sm" variant="outline" className="mt-1 bg-white" onClick={onRecalculate}>
                  {t('recalculate')}
                </Button>
              ) : null
            }
          >
            {t('warnings.closingOwnDescription', values)}
          </Notice>
        ) : (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<AlertTriangle />}
            className={WARNING_CLASS}
            title={t('warnings.closingOtherTitle', values)}
          >
            {t('warnings.closingOtherDescription', values)}
          </Notice>
        );
      }
      case 'PAST_YEARS':
        return (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<AlertTriangle />}
            className={WARNING_CLASS}
            title={t('warnings.pastYearsTitle')}
          >
            <ul className="space-y-0.5">
              {warning.years.map((year) => (
                <li key={year.year} className="tabular-nums">
                  {t('warnings.pastYearsRow', {
                    year: year.year,
                    interestBefore: formatCurrency(year.interestBefore),
                    interestAfter: formatCurrency(year.interestAfter),
                    balanceBefore: formatCurrency(year.balanceBefore),
                    balanceAfter: formatCurrency(year.balanceAfter),
                  })}
                </li>
              ))}
            </ul>
          </Notice>
        );
      case 'NOTIFIED':
        return (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<Info />}
            className={INFO_CLASS}
            title={t('warnings.notifiedTitle')}
          >
            {t('warnings.notifiedDescription', { date: formatDateShort(warning.notifiedAt, locale) })}
          </Notice>
        );
      case 'EXISTING_VIOLATIONS':
        return (
          <Notice
            key={`${warning.kind}-${index}`}
            icon={<Info />}
            className={INFO_CLASS}
            title={t('warnings.existingTitle')}
          >
            {t('warnings.existingDescription', { count: warning.count })}
          </Notice>
        );
    }
  };

  return (
    <div className="space-y-2">
      {unavailableMessage ? (
        <Notice destructive icon={<XCircle />}>
          {unavailableMessage}
        </Notice>
      ) : null}
      {preview.errors.map((error) => (
        <Notice destructive key={`${error.rule}-${error.transactionId}`} icon={<XCircle />}>
          {violationMessage(error)}
        </Notice>
      ))}
      {preview.warnings.map(renderWarning)}
    </div>
  );
}
