'use client';

import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, FileUp, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getImportColumns, type ImportColumnGroup, type ImportSystemColumn } from '@/lib/import/system-columns';
import {
  type DateOrder,
  type DecimalSeparator,
  IMPORT_DELIMITERS,
  IMPORT_ENCODINGS,
  type ImportContext,
  type ImportDelimiter,
  type ImportEncoding,
  type ImportFileOptions,
  type ImportIssue,
  type ImportSettings,
  type ImportValidationResult,
} from '@/lib/import/types';
import { findLoanTemplate, LOAN_TEMPLATE_KEYS, loanTemplateDefaults } from '@/lib/import/validate';
import { cellText, valueKey } from '@/lib/import/values';
import { cn, formatCurrency } from '@/lib/utils';

import type { ImportFileState } from './import-wizard';
import { useImportLabels } from './use-import-labels';

const NONE = '__none';
const MAX_SHOWN_ROWS = 200;
const GROUPS: ImportColumnGroup[] = ['lender', 'loan', 'opening'];
const DELIMITER_LABELS: Record<ImportDelimiter, string> = { ';': 'semicolon', ',': 'comma', '\t': 'tab' };

type Props = {
  file: ImportFileState;
  settings: ImportSettings;
  context: ImportContext;
  validation: ImportValidationResult;
  isReading: boolean;
  restoredFromLast: boolean;
  onSettingsChange: (settings: ImportSettings) => void;
  onFileOptionsChange: (options: ImportFileOptions) => void;
  onOtherFile: () => void;
  onNext: () => void;
};

export function ImportMappingStep({
  file,
  settings,
  context,
  validation,
  isReading,
  restoredFromLast,
  onSettingsChange,
  onFileOptionsChange,
  onOtherFile,
  onNext,
}: Props) {
  const t = useTranslations('dashboard.configuration.import.wizard');
  const columns = useMemo(() => getImportColumns(context), [context]);
  const labels = useImportLabels(columns);
  const { table } = file.parsed;

  const setColumn = (key: string, value: string) => {
    const next = { ...settings.columns };
    if (value === NONE) delete next[key];
    else next[key] = Number(value);
    onSettingsChange({ ...settings, columns: next });
  };

  const setDefault = (key: string, value: string) => {
    const next = { ...settings.defaults };
    if (value === '') delete next[key];
    else next[key] = value;
    onSettingsChange({ ...settings, defaults: next });
  };

  const setAssignment = (key: string, fileValue: string, value: string) => {
    onSettingsChange({
      ...settings,
      valueAssignments: {
        ...settings.valueAssignments,
        [key]: { ...settings.valueAssignments[key], [valueKey(fileValue)]: value },
      },
    });
  };

  const setLoanTemplate = (templateId: string) => {
    const loanTemplateId = templateId === NONE ? null : templateId;
    const defaults = { ...settings.defaults };
    for (const key of LOAN_TEMPLATE_KEYS) delete defaults[key];
    const template = loanTemplateId ? findLoanTemplate(context, loanTemplateId) : undefined;
    for (const [key, value] of Object.entries(loanTemplateDefaults(template))) {
      if (value !== '') defaults[key] = value;
    }
    onSettingsChange({ ...settings, loanTemplateId, defaults });
  };

  const example = (index: number) => {
    for (const row of table.rows) {
      const value = cellText(row[index] ?? null);
      if (value !== '') return value;
    }
    return '';
  };

  const { summary } = validation;
  const unknownEntries = Object.entries(validation.unknownValues).filter(([, values]) => values.length > 0);

  return (
    <div className="space-y-6">
      <FormSection title={file.name} icon={<FileUp className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          {t('upload.rows', { rows: table.rows.length, columns: table.headers.length })}
          {restoredFromLast && ` · ${t('upload.restored')}`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {file.parsed.kind === 'xlsx' && file.parsed.sheets.length > 1 && (
            <LabeledSelect
              label={t('file.sheet')}
              value={settings.file.sheet ?? ''}
              disabled={isReading}
              options={file.parsed.sheets.map((sheet) => ({ value: sheet, label: sheet }))}
              onChange={(sheet) => onFileOptionsChange({ sheet })}
            />
          )}
          {file.parsed.kind === 'csv' && (
            <>
              <LabeledSelect
                label={t('file.delimiter')}
                value={settings.file.delimiter ?? ';'}
                disabled={isReading}
                options={IMPORT_DELIMITERS.map((value) => ({ value, label: t(`file.${DELIMITER_LABELS[value]}`) }))}
                onChange={(delimiter) => onFileOptionsChange({ delimiter: delimiter as ImportDelimiter })}
              />
              <LabeledSelect
                label={t('file.encoding')}
                value={settings.file.encoding ?? 'utf-8'}
                disabled={isReading}
                options={IMPORT_ENCODINGS.map((value) => ({ value, label: value.toUpperCase() }))}
                onChange={(encoding) => onFileOptionsChange({ encoding: encoding as ImportEncoding })}
              />
            </>
          )}
          <LabeledSelect
            label={t('format.decimalSeparator')}
            value={settings.format.decimalSeparator}
            options={[
              { value: ',', label: t('format.comma') },
              { value: '.', label: t('format.point') },
            ]}
            onChange={(value) =>
              onSettingsChange({
                ...settings,
                format: { ...settings.format, decimalSeparator: value as DecimalSeparator },
              })
            }
          />
          <LabeledSelect
            label={t('format.dateOrder')}
            value={settings.format.dateOrder}
            options={(['DMY', 'YMD', 'MDY'] as const).map((value) => ({ value, label: t(`format.${value}`) }))}
            onChange={(value) =>
              onSettingsChange({ ...settings, format: { ...settings.format, dateOrder: value as DateOrder } })
            }
          />
          {context.loanTemplates.length > 0 && (
            <LabeledSelect
              label={t('format.loanTemplate')}
              value={settings.loanTemplateId ?? NONE}
              options={[
                { value: NONE, label: t('format.noTemplate') },
                ...context.loanTemplates.map((template) => ({ value: template.id, label: template.name })),
              ]}
              onChange={setLoanTemplate}
            />
          )}
        </div>
        <Button type="button" variant="outline" onClick={onOtherFile}>
          {t('otherFile')}
        </Button>
      </FormSection>

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge severity="error" count={summary.errors} label={t('status.errors', { count: summary.errors })} />
          <StatusBadge
            severity="warning"
            count={summary.warnings}
            label={t('status.warnings', { count: summary.warnings })}
          />
          <span className="text-muted-foreground">
            {t('status.rows', { rows: summary.rows, lenders: summary.lenders })}
          </span>
        </div>
        <Button type="button" onClick={onNext}>
          {t('next')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {validation.issues.length > 0 && <IssueList issues={validation.issues} issueText={labels.issueText} />}

      {unknownEntries.length > 0 && (
        <FormSection
          title={t('values.title')}
          description={t('values.hint')}
          icon={<CircleAlert className="h-4 w-4 text-destructive" />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('mapping.systemColumn')}</TableHead>
                <TableHead>{t('values.fileValue')}</TableHead>
                <TableHead>{t('values.systemValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unknownEntries.flatMap(([key, values]) => {
                const column = columns.find((entry) => entry.key === key);
                return values.map((fileValue) => (
                  <TableRow key={`${key}-${fileValue}`}>
                    <TableCell>{labels.columnLabel(key)}</TableCell>
                    <TableCell className="font-mono text-sm">{fileValue}</TableCell>
                    <TableCell>
                      <Select onValueChange={(value) => setAssignment(key, fileValue, value)}>
                        <SelectTrigger className="w-full min-w-48">
                          <SelectValue placeholder={t('values.choose')} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(column?.options ?? {}).map((option) => (
                            <SelectItem key={option} value={option}>
                              {labels.optionLabel(key, option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </FormSection>
      )}

      {GROUPS.map((group) => (
        <FormSection
          key={group}
          title={t(`groups.${group}`)}
          description={group === 'opening' ? t('openingHint') : undefined}
          icon={null}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">{t('mapping.systemColumn')}</TableHead>
                <TableHead className="w-[32%]">{t('mapping.fileColumn')}</TableHead>
                <TableHead className="w-[32%]" title={t('mapping.defaultHint')}>
                  {t('mapping.default')}
                </TableHead>
                <TableHead>{t('mapping.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns
                .filter((column) => column.group === group)
                .map((column) => {
                  const index = settings.columns[column.key];
                  const counts = validation.columnCounts[column.key];
                  const sample = index === undefined ? '' : example(index);
                  return (
                    <TableRow key={column.key}>
                      <TableCell className="font-medium">{labels.columnLabel(column.key)}</TableCell>
                      <TableCell>
                        <Select
                          value={index === undefined ? NONE : String(index)}
                          onValueChange={(value) => setColumn(column.key, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{t('mapping.notAssigned')}</SelectItem>
                            {table.headers.map((header, headerIndex) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: headers may repeat; the index is the identity
                              <SelectItem key={headerIndex} value={String(headerIndex)}>
                                {header || `#${headerIndex + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sample && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {t('mapping.example', { value: sample })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DefaultInput
                          column={column}
                          value={settings.defaults[column.key] ?? ''}
                          optionLabel={(value) => labels.optionLabel(column.key, value)}
                          onChange={(value) => setDefault(column.key, value)}
                        />
                      </TableCell>
                      <TableCell>
                        <ColumnStatus errors={counts?.errors ?? 0} warnings={counts?.warnings ?? 0} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </FormSection>
      ))}

      <RowsSection file={file} settings={settings} validation={validation} issueText={labels.issueText} />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DefaultInput({
  column,
  value,
  optionLabel,
  onChange,
}: {
  column: ImportSystemColumn;
  value: string;
  optionLabel: (value: string) => string;
  onChange: (value: string) => void;
}) {
  if (column.options) {
    return (
      <Select value={value === '' ? NONE : value} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>–</SelectItem>
          {Object.keys(column.options).map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  switch (column.kind) {
    case 'date':
      return <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
    case 'int':
    case 'money':
    case 'percent':
    case 'number':
      return (
        <Input
          type="number"
          step={column.kind === 'int' ? 1 : 'any'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return <Input value={value} onChange={(event) => onChange(event.target.value)} />;
  }
}

function ColumnStatus({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors === 0 && warnings === 0) return <CheckCircle2 className="h-4 w-4 text-success-foreground" />;
  return (
    <div className="flex flex-wrap gap-1">
      {errors > 0 && <StatusBadge severity="error" count={errors} label={String(errors)} />}
      {warnings > 0 && <StatusBadge severity="warning" count={warnings} label={String(warnings)} />}
    </div>
  );
}

export function StatusBadge({
  severity,
  count,
  label,
}: {
  severity: 'error' | 'warning';
  count: number;
  label: string;
}) {
  const Icon = severity === 'error' ? CircleAlert : AlertTriangle;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        count === 0 && 'text-muted-foreground',
        count > 0 && severity === 'error' && 'border-destructive text-destructive',
        count > 0 && severity === 'warning' && 'border-amber-500 text-amber-700 dark:text-amber-400',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

export function IssueList({
  issues,
  issueText,
}: {
  issues: ImportIssue[];
  issueText: (issue: ImportIssue, withColumn?: boolean) => string;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {issues.map((issue, index) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: issues have no identity of their own
          key={index}
          className={cn(
            'flex items-start gap-1.5',
            issue.severity === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
          )}
        >
          {issue.severity === 'error' ? (
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {issueText(issue)}
        </li>
      ))}
    </ul>
  );
}

function RowsSection({
  file,
  settings,
  validation,
  issueText,
}: {
  file: ImportFileState;
  settings: ImportSettings;
  validation: ImportValidationResult;
  issueText: (issue: ImportIssue, withColumn?: boolean) => string;
}) {
  const t = useTranslations('dashboard.configuration.import.wizard.rows');
  const [onlyProblems, setOnlyProblems] = useState(true);
  const rows = onlyProblems ? validation.rows.filter((row) => row.issues.length > 0) : validation.rows;
  const shown = rows.slice(0, MAX_SHOWN_ROWS);
  const raw = (rowIndex: number, key: string) => {
    const index = settings.columns[key];
    return index === undefined ? '' : cellText(file.parsed.table.rows[rowIndex]?.[index] ?? null);
  };

  return (
    <FormSection title={t('title')} icon={null}>
      <div className="flex items-center gap-2">
        <Checkbox
          id="import-only-problems"
          checked={onlyProblems}
          onCheckedChange={(checked) => setOnlyProblems(checked === true)}
        />
        <Label htmlFor="import-only-problems">{t('onlyProblems')}</Label>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('row')}</TableHead>
              <TableHead>{t('lender')}</TableHead>
              <TableHead>{t('loan')}</TableHead>
              <TableHead className="text-right">{t('kontostand')}</TableHead>
              <TableHead className="w-1/2">{t('issues')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={row.index}>
                <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                <TableCell>
                  {raw(row.index, 'lender.organisationName') ||
                    `${raw(row.index, 'lender.firstName')} ${raw(row.index, 'lender.lastName')}`.trim()}
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.loan ? `#${row.loan.loanNumber}` : raw(row.index, 'loan.loanNumber')}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.opening ? formatCurrency(row.opening.kontostand) : raw(row.index, 'opening.kontostand')}
                </TableCell>
                <TableCell>
                  <IssueList issues={row.issues} issueText={issueText} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {rows.length > shown.length && (
        <p className="text-sm text-muted-foreground">{t('more', { count: rows.length - shown.length })}</p>
      )}
    </FormSection>
  );
}
