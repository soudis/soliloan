'use client';

import type { TemplateDataset } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import {
  getSampleLendersAction,
  getSampleLenderYearsAction,
  getSampleLoansAction,
  getSampleTransactionsAction,
} from '@/actions/templates/queries/get-template-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';
import type { SampleLenderRow, SampleLoanRow, SampleTransactionRow } from '@/lib/templates/template-editor-page-data';

interface SampleDataSelectorProps {
  dataset: TemplateDataset;
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Reporting year for `LENDER_YEARLY` preview (complete past years only). */
  selectedYear?: number | null;
  onYearChange?: (year: number | null) => void;
  /** Server-loaded preview project: when it matches `projectId`, use initial lists instead of fetching. */
  serverHydratedProjectId?: string | null;
  initialSampleLenders?: SampleLenderRow[];
  initialSampleLoans?: SampleLoanRow[];
  initialSampleTransactions?: SampleTransactionRow[];
  initialLenderYearsByLenderId?: Record<string, number[]>;
}

export function SampleDataSelector({
  dataset,
  projectId,
  value,
  onChange,
  selectedYear,
  onYearChange,
  serverHydratedProjectId,
  initialSampleLenders = [],
  initialSampleLoans = [],
  initialSampleTransactions = [],
  initialLenderYearsByLenderId = {},
}: SampleDataSelectorProps) {
  const t = useTranslations('templates');

  const isLenderSample = dataset === 'LENDER' || dataset === 'LENDER_YEARLY';
  const isLoanOrTransactionSample = dataset === 'LOAN' || dataset === 'TRANSACTION';
  const useServerHydration = serverHydratedProjectId != null && projectId === serverHydratedProjectId;

  const { data: fetchedRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['sample-data', dataset, projectId],
    queryFn: async () => {
      switch (dataset) {
        case 'LENDER':
        case 'LENDER_YEARLY':
          return getSampleLendersAction(projectId);
        case 'LOAN':
          return getSampleLoansAction(projectId);
        case 'TRANSACTION':
          return getSampleTransactionsAction(projectId);
        default:
          return [];
      }
    },
    enabled: (isLenderSample || isLoanOrTransactionSample) && !!projectId && !useServerHydration,
  });

  const sampleRecords = useServerHydration
    ? dataset === 'LOAN'
      ? initialSampleLoans
      : dataset === 'TRANSACTION'
        ? initialSampleTransactions
        : initialSampleLenders
    : fetchedRecords;

  const isLoading = useServerHydration ? false : recordsLoading;

  const useServerYears =
    useServerHydration && dataset === 'LENDER_YEARLY' && !!value && Object.hasOwn(initialLenderYearsByLenderId, value);

  const { data: fetchedYears, isLoading: yearsLoading } = useQuery({
    queryKey: ['sample-lender-years', value],
    queryFn: async () => {
      if (!value) return [];
      return getSampleLenderYearsAction(value);
    },
    enabled: dataset === 'LENDER_YEARLY' && !!value && !useServerYears,
  });

  const sampleYears = useServerYears && value ? (initialLenderYearsByLenderId[value] ?? []) : fetchedYears;

  const yearsLoadingState = useServerYears ? false : yearsLoading;

  useEffect(() => {
    if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') return;
    if (!(isLenderSample || isLoanOrTransactionSample)) return;
    if (!sampleRecords?.length) return;
    if (value != null && sampleRecords.some((r) => r.id === value)) return;
    onChange(sampleRecords[0].id);
  }, [dataset, isLenderSample, isLoanOrTransactionSample, sampleRecords, value, onChange]);

  useEffect(() => {
    if (dataset !== 'LENDER_YEARLY' || !onYearChange) return;
    if (!sampleYears?.length) {
      onYearChange(null);
      return;
    }
    if (selectedYear != null && sampleYears.includes(selectedYear)) return;
    onYearChange(sampleYears[0] ?? null);
  }, [dataset, sampleYears, selectedYear, onYearChange]);

  // Project-level datasets don't need sample selection
  if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') {
    return null;
  }

  const getRecordLabel = (record: NonNullable<typeof sampleRecords>[0]) => {
    if (!record) return '';

    if (isLenderSample) {
      const lender = record as unknown as SampleLenderRow;
      const name =
        lender.type === 'PERSON'
          ? `${lender.firstName ?? ''} ${lender.lastName ?? ''}`.trim()
          : (lender.organisationName ?? '');
      return `#${lender.lenderNumber} - ${name}`;
    }

    if (dataset === 'LOAN') {
      const loan = record as unknown as SampleLoanRow;
      const lenderName =
        loan.lender.type === 'PERSON'
          ? `${loan.lender.firstName ?? ''} ${loan.lender.lastName ?? ''}`.trim()
          : (loan.lender.organisationName ?? '');
      return `#${loan.loanNumber} - ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(loan.amount)} (${lenderName})`;
    }

    if (dataset === 'TRANSACTION') {
      const tx = record as unknown as SampleTransactionRow;
      const lenderName =
        tx.loan.lender.type === 'PERSON'
          ? `${tx.loan.lender.firstName ?? ''} ${tx.loan.lender.lastName ?? ''}`.trim()
          : (tx.loan.lender.organisationName ?? '');
      const dateStr = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short' }).format(new Date(tx.date));
      return `${dateStr} · #${tx.loan.loanNumber} · ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tx.amount)} (${lenderName})`;
    }

    return '';
  };

  const lenderRecordPlaceholder = isLoading
    ? 'Laden...'
    : dataset === 'LENDER_YEARLY'
      ? t('editor.selectSampleLenderYearly')
      : t('editor.selectSampleRecord', { type: getDatasetDisplayName(dataset) });

  /** LOAN / TRANSACTION: width follows selected label (one line); avoids a min-width that wraps the whole control to the next row. */
  const lenderSelectTriggerClass =
    dataset === 'LOAN' || dataset === 'TRANSACTION'
      ? 'h-10 w-fit max-w-full shrink-0 whitespace-nowrap text-left gap-2 [&>span]:min-w-0 [&>span]:text-left'
      : 'h-10 w-[280px] text-left [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left';

  const lenderSelect = (
    <Select value={value ?? undefined} onValueChange={(val) => onChange(val || null)} disabled={isLoading}>
      <SelectTrigger className={lenderSelectTriggerClass}>
        <SelectValue placeholder={lenderRecordPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {sampleRecords?.map((record) => (
          <SelectItem key={record.id} value={record.id}>
            {getRecordLabel(record)}
          </SelectItem>
        ))}
        {!isLoading && (!sampleRecords || sampleRecords.length === 0) && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('editor.noSampleRecords')}</div>
        )}
      </SelectContent>
    </Select>
  );

  if (dataset === 'LENDER_YEARLY') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {lenderSelect}
        <Select
          value={selectedYear != null ? String(selectedYear) : undefined}
          onValueChange={(val) => onYearChange?.(val ? Number.parseInt(val, 10) : null)}
          disabled={!value || yearsLoadingState || !sampleYears?.length}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={yearsLoadingState ? 'Laden...' : t('editor.selectSampleYear')} />
          </SelectTrigger>
          <SelectContent>
            {sampleYears?.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
            {!yearsLoadingState && (!sampleYears || sampleYears.length === 0) && value && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('editor.noSampleRecords')}</div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return lenderSelect;
}
