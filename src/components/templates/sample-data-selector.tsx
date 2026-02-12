'use client';

import type { TemplateDataset } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getSampleLendersAction, getSampleLoansAction } from '@/actions/templates/queries/get-sample-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDatasetDisplayName } from '@/lib/templates/merge-tags';

interface SampleDataSelectorProps {
  dataset: TemplateDataset;
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SampleDataSelector({ dataset, projectId, value, onChange }: SampleDataSelectorProps) {
  const t = useTranslations('templates');

  // Fetch sample records based on dataset type
  const { data: sampleRecords, isLoading } = useQuery({
    queryKey: ['sample-data', dataset, projectId],
    queryFn: async () => {
      switch (dataset) {
        case 'LENDER':
          return getSampleLendersAction(projectId);
        case 'LOAN':
          return getSampleLoansAction(projectId);
        case 'PROJECT':
        case 'PROJECT_YEARLY':
          // For project-level, no sample selection needed
          return [];
        default:
          return [];
      }
    },
    enabled: (dataset === 'LENDER' || dataset === 'LOAN') && !!projectId,
  });

  // Project-level datasets don't need sample selection
  if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') {
    return null;
  }

  const getRecordLabel = (record: NonNullable<typeof sampleRecords>[0]) => {
    if (!record) return '';

    if (dataset === 'LENDER') {
      const lender = record as {
        lenderNumber: number;
        firstName?: string | null;
        lastName?: string | null;
        organisationName?: string | null;
        type: string;
      };
      const name =
        lender.type === 'PERSON'
          ? `${lender.firstName ?? ''} ${lender.lastName ?? ''}`.trim()
          : (lender.organisationName ?? '');
      return `#${lender.lenderNumber} - ${name}`;
    }

    if (dataset === 'LOAN') {
      const loan = record as {
        loanNumber: number;
        amount: number;
        lender: { firstName?: string | null; lastName?: string | null; organisationName?: string | null; type: string };
      };
      const lenderName =
        loan.lender.type === 'PERSON'
          ? `${loan.lender.firstName ?? ''} ${loan.lender.lastName ?? ''}`.trim()
          : (loan.lender.organisationName ?? '');
      return `#${loan.loanNumber} - ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(loan.amount)} (${lenderName})`;
    }

    return '';
  };

  return (
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
}
