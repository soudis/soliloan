'use client';

import type { TemplateDataset } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import {
  getSampleLendersAction,
  getSampleLenderYearsAction,
  getSampleLoansAction,
} from '@/actions/templates/queries/get-template-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';

type SampleLenderRecord = Awaited<ReturnType<typeof getSampleLendersAction>>[number];
type SampleLoanRecord = Awaited<ReturnType<typeof getSampleLoansAction>>[number];

interface SampleDataSelectorProps {
  dataset: TemplateDataset;
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Reporting year for `LENDER_YEARLY` preview (complete past years only). */
  selectedYear?: number | null;
  onYearChange?: (year: number | null) => void;
}

export function SampleDataSelector({
  dataset,
  projectId,
  value,
  onChange,
  selectedYear,
  onYearChange,
}: SampleDataSelectorProps) {
  const t = useTranslations('templates');

  const isLenderSample = dataset === 'LENDER' || dataset === 'LENDER_YEARLY';

  // Fetch sample records based on dataset type
  const { data: sampleRecords, isLoading } = useQuery({
    queryKey: ['sample-data', dataset, projectId],
    queryFn: async () => {
      switch (dataset) {
        case 'LENDER':
        case 'LENDER_YEARLY':
          return getSampleLendersAction(projectId);
        case 'LOAN':
          return getSampleLoansAction(projectId);
        case 'PROJECT':
        case 'PROJECT_YEARLY':
          return [];
        default:
          return [];
      }
    },
    enabled: (isLenderSample || dataset === 'LOAN') && !!projectId,
  });

  const { data: sampleYears, isLoading: yearsLoading } = useQuery({
    queryKey: ['sample-lender-years', value],
    queryFn: async () => {
      if (!value) return [];
      return getSampleLenderYearsAction(value);
    },
    enabled: dataset === 'LENDER_YEARLY' && !!value,
  });

  useEffect(() => {
    if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') return;
    if (!(isLenderSample || dataset === 'LOAN')) return;
    if (!sampleRecords?.length) return;
    if (value != null && sampleRecords.some((r) => r.id === value)) return;
    onChange(sampleRecords[0].id);
  }, [dataset, isLenderSample, sampleRecords, value, onChange]);

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
      const lender = record as unknown as SampleLenderRecord;
      const name =
        lender.type === 'PERSON'
          ? `${lender.firstName ?? ''} ${lender.lastName ?? ''}`.trim()
          : (lender.organisationName ?? '');
      return `#${lender.lenderNumber} - ${name}`;
    }

    if (dataset === 'LOAN') {
      const loan = record as unknown as SampleLoanRecord;
      const lenderName =
        loan.lender.type === 'PERSON'
          ? `${loan.lender.firstName ?? ''} ${loan.lender.lastName ?? ''}`.trim()
          : (loan.lender.organisationName ?? '');
      return `#${loan.loanNumber} - ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(loan.amount)} (${lenderName})`;
    }

    return '';
  };

  const lenderSelect = (
    <Select value={value ?? undefined} onValueChange={(val) => onChange(val || null)} disabled={isLoading}>
      <SelectTrigger className="w-[280px]">
        <SelectValue
          placeholder={
            isLoading ? 'Laden...' : t('editor.selectSampleRecord', { type: getDatasetDisplayName(dataset) })
          }
        />
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
          disabled={!value || yearsLoading || !sampleYears?.length}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={yearsLoading ? 'Laden...' : t('editor.selectSampleYear')} />
          </SelectTrigger>
          <SelectContent>
            {sampleYears?.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
            {!yearsLoading && (!sampleYears || sampleYears.length === 0) && value && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('editor.noSampleRecords')}</div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return lenderSelect;
}
