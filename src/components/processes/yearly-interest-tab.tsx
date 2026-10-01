'use client';

import { InterestPaymentType } from '@prisma/client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { Wand2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';

import { getYearlyInterestPayoutAction } from '@/actions/processes/queries/get-yearly-interest-payout';
import { YearlyInterestWizard } from '@/components/processes/yearly-interest-wizard';
import { useProject } from '@/components/providers/project-provider';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { buildAllLoanTableColumns } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { buildLoanTableColumnFilters } from '@/lib/entity-filters/filter-definitions';
import { buildYearlyInterestPayoutHref } from '@/lib/processes/yearly-interest-link';
import type { YearlyInterestLoanRow, YearlyInterestLoanView } from '@/lib/processes/yearly-interest-view';
import { createCurrencyColumn, withColumnGroup } from '@/lib/table-column-utils';
import { getLenderName } from '@/lib/utils';

const VISIBLE_COLUMN_IDS = [
  'loanNumber',
  'lender.name',
  'interestRate',
  'interestPaymentType',
  'unpaidYearlyInterest',
] as const;

const YEARLY_INTEREST_DEFAULT_FILTERS: ColumnFiltersState = [
  {
    id: 'interestPaymentType',
    value: { operator: 'eq', value: InterestPaymentType.YEARLY },
  },
];

function columnId(column: ColumnDef<YearlyInterestLoanRow>): string {
  if (column.id) return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey;
  return '';
}

function toPayoutView(loan: YearlyInterestLoanRow): YearlyInterestLoanView {
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    interestRate: loan.interestRate,
    unpaid: loan.unpaidYearlyInterest,
    lender: {
      id: loan.lender.id,
      name: getLenderName(loan.lender),
      email: loan.lender.email,
      iban: loan.lender.iban,
      bic: loan.lender.bic,
      street: loan.lender.street,
      addon: loan.lender.addon,
      zip: loan.lender.zip,
      place: loan.lender.place,
      country: loan.lender.country,
    },
  };
}

export function YearlyInterestTab() {
  const t = useTranslations('processes.yearlyInterest');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const locale = useLocale();
  const { project, projectId } = useProject();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useQueryState('year', parseAsInteger.withDefault(currentYear));
  const [wizardLoans, setWizardLoans] = useState<YearlyInterestLoanView[] | null>(null);

  const query = useQuery({
    queryKey: ['yearly-interest', projectId, year],
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await getYearlyInterestPayoutAction({ projectId, year });
      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError ?? 'failed');
      }
      return result.data;
    },
  });

  const loans = (query.data?.loans ?? []) as YearlyInterestLoanRow[];
  const minYear = query.data?.minYear ?? currentYear;
  const maxYear = query.data?.maxYear ?? currentYear;
  const years = useMemo(() => {
    const values: number[] = [];
    for (let value = minYear; value <= maxYear; value += 1) values.push(value);
    if (!values.includes(year)) values.push(year);
    return values.sort((a, b) => a - b);
  }, [minYear, maxYear, year]);

  const columns = useMemo<ColumnDef<YearlyInterestLoanRow>[]>(() => {
    const loanColumns = buildAllLoanTableColumns(project, tLoans, tLenders, commonT, locale, (key, values) =>
      tDuration(key, values),
    ) as ColumnDef<YearlyInterestLoanRow>[];
    const unpaidColumn = withColumnGroup(
      [createCurrencyColumn<YearlyInterestLoanRow>('unpaidYearlyInterest', 'columns.unpaid', t, locale)],
      { key: 'loan', order: 0 },
    )[0];
    if (!unpaidColumn) return loanColumns;

    const withUnpaid = [...loanColumns];
    const paymentTypeIndex = withUnpaid.findIndex((column) => columnId(column) === 'interestPaymentType');
    withUnpaid.splice(paymentTypeIndex === -1 ? withUnpaid.length : paymentTypeIndex + 1, 0, unpaidColumn);

    const priority = new Set<string>(VISIBLE_COLUMN_IDS);
    const leading = VISIBLE_COLUMN_IDS.map((id) => withUnpaid.find((column) => columnId(column) === id)).filter(
      (column): column is ColumnDef<YearlyInterestLoanRow> => column !== undefined,
    );
    const rest = withUnpaid.filter((column) => !priority.has(columnId(column)));
    return [...leading, ...rest];
  }, [project, tLoans, tLenders, commonT, locale, tDuration, t]);

  const defaultColumnVisibility = useMemo(() => {
    const visible = new Set<string>(VISIBLE_COLUMN_IDS);
    return Object.fromEntries(columns.map((column) => [columnId(column), visible.has(columnId(column))]));
  }, [columns]);

  const columnFilters = useMemo(
    () => ({
      ...buildLoanTableColumnFilters(project, tLoans, tLenders, commonT),
      unpaidYearlyInterest: { type: 'number' as const, label: t('columns.unpaid') },
    }),
    [project, tLoans, tLenders, commonT, t],
  );

  const bulkActions: BulkAction[] = [
    {
      label: t('assistant'),
      icon: <Wand2 className="h-4 w-4" />,
      onClick: (ids) => {
        setWizardLoans(loans.filter((loan) => ids.includes(loan.id)).map(toPayoutView));
      },
    },
  ];

  const payoutCount = query.data?.payoutCount ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <DataTable
        columns={columns}
        data={loans}
        bulkActions={bulkActions}
        getRowId={(row) => row.id}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        defaultColumnFilters={YEARLY_INTEREST_DEFAULT_FILTERS}
        defaultFiltersExpanded
        showExport
        exportPrefix="Zinsauszahlung"
        isLoading={query.isPending && !query.data}
        emptyMessage={query.isError ? t('error') : t('empty')}
        toolbarAlign="center"
        toolbarContent={
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(value) => void setYear(Number(value))}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={payoutCount === 0}
              onClick={() => router.push(buildYearlyInterestPayoutHref(projectId, year))}
            >
              {t('payouts', { count: payoutCount })}
            </Button>
          </div>
        }
      />

      {wizardLoans && query.data ? (
        <YearlyInterestWizard
          open
          onOpenChange={(open) => {
            if (!open) setWizardLoans(null);
          }}
          projectId={projectId}
          year={year}
          loans={wizardLoans}
          sepaGaps={query.data.sepaGaps}
        />
      ) : null}
    </div>
  );
}
