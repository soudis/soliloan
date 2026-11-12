'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSection } from '@/components/ui/form-section';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getImportColumns } from '@/lib/import/system-columns';
import type { ImportContext, ImportIssue, ImportTotals, ImportValidationResult } from '@/lib/import/types';
import { formatCurrency, formatDateLong } from '@/lib/utils';

import { IssueList, StatusBadge } from './import-mapping-step';
import { useImportLabels } from './use-import-labels';

type Props = {
  context: ImportContext;
  validation: ImportValidationResult;
  isImporting: boolean;
  onBack: () => void;
  onImport: (acknowledgeWarnings: boolean) => void;
};

/** Warnings of all rows, grouped by message and column, with how many rows they concern. */
function groupWarnings(validation: ImportValidationResult) {
  const groups = new Map<string, { issue: ImportIssue; rows: number[] }>();
  for (const row of validation.rows) {
    for (const issue of row.issues) {
      if (issue.severity !== 'warning') continue;
      const key = `${issue.code}|${issue.column ?? ''}`;
      const group = groups.get(key) ?? { issue: { ...issue, params: undefined }, rows: [] };
      group.rows.push(row.rowNumber);
      groups.set(key, group);
    }
  }
  return [...groups.values()];
}

export function ImportPreviewStep({ context, validation, isImporting, onBack, onImport }: Props) {
  const t = useTranslations('dashboard.configuration.import.wizard');
  const locale = useLocale();
  const columns = useMemo(() => getImportColumns(context), [context]);
  const labels = useImportLabels(columns);
  const [acknowledged, setAcknowledged] = useState(false);
  const { summary } = validation;
  const warnings = useMemo(() => groupWarnings(validation), [validation]);
  const hasErrors = summary.errors > 0;
  const needsAcknowledgement = summary.warnings > 0;

  const totalsCells = (totals: ImportTotals) => (
    <>
      <TableCell className="text-right tabular-nums">{totals.loans}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(totals.amount, locale)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(totals.einlagenstand, locale)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(totals.zinsuebertrag, locale)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(totals.kontostand, locale)}</TableCell>
    </>
  );

  return (
    <div className="space-y-6">
      <FormSection title={t('steps.preview')} icon={null}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge severity="error" count={summary.errors} label={t('status.errors', { count: summary.errors })} />
          <StatusBadge
            severity="warning"
            count={summary.warnings}
            label={t('status.warnings', { count: summary.warnings })}
          />
        </div>
        {hasErrors ? (
          <p className="text-sm font-medium text-destructive">{t('preview.blocked')}</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Figure label={t('preview.lenders')} value={String(summary.lenders)} />
            <Figure label={t('preview.loans')} value={String(summary.loans)} />
            <Figure label={t('preview.kontostand')} value={formatCurrency(summary.totals.kontostand, locale)} />
            <Figure label={t('preview.zinsuebertrag')} value={formatCurrency(summary.totals.zinsuebertrag, locale)} />
          </dl>
        )}
        {!hasErrors && summary.byStichtag.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('preview.stichtag')}</TableHead>
                <TableHead className="text-right">{t('preview.loans')}</TableHead>
                <TableHead className="text-right">{t('preview.amount')}</TableHead>
                <TableHead className="text-right">{t('preview.einlagenstand')}</TableHead>
                <TableHead className="text-right">{t('preview.zinsuebertrag')}</TableHead>
                <TableHead className="text-right">{t('preview.kontostand')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.byStichtag.map((entry) => (
                <TableRow key={entry.stichtag}>
                  <TableCell>{formatDateLong(entry.stichtag, locale)}</TableCell>
                  {totalsCells(entry)}
                </TableRow>
              ))}
            </TableBody>
            {summary.byStichtag.length > 1 && (
              <TableFooter>
                <TableRow>
                  <TableCell>{t('preview.total')}</TableCell>
                  {totalsCells(summary.totals)}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </FormSection>

      {(validation.issues.length > 0 || warnings.length > 0) && (
        <FormSection title={t('preview.warnings')} icon={null}>
          <IssueList issues={validation.issues} issueText={labels.issueText} />
          <ul className="space-y-1 text-sm">
            {warnings.map(({ issue, rows }) => (
              <li key={`${issue.code}-${issue.column}`} className="text-amber-700 dark:text-amber-400">
                <span className="font-medium tabular-nums">{rows.length}×</span> {labels.issueText(issue)}{' '}
                <span className="text-muted-foreground">
                  ({t('rows.row')} {rows.slice(0, 10).join(', ')}
                  {rows.length > 10 ? ', …' : ''})
                </span>
              </li>
            ))}
          </ul>
        </FormSection>
      )}

      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">{t('preview.noEmails')}</p>
        {needsAcknowledgement && !hasErrors && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="import-acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="import-acknowledge">{t('preview.acknowledge')}</Label>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isImporting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
          <Button
            type="button"
            disabled={hasErrors || isImporting || (needsAcknowledgement && !acknowledged)}
            onClick={() => onImport(acknowledged)}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? t('preview.importing') : t('preview.import')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
