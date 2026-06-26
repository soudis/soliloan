'use client';

import { type InvestmentType, LimitationType, type Loan, type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { useSelectedViewName } from '@/lib/hooks/use-selected-view-name';
import {
  calcInvestmentTypeMetrics,
  calcTotalAmount,
  type InvestmentTypeMetrics,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { getDefaultEffectiveDate } from '@/lib/investment-types/effective-date';
import { PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import {
  createColumn,
  createCurrencyColumn,
  createNumberColumn,
  createPercentageColumn,
  enumFilter,
} from '@/lib/table-column-utils';
import { formatCurrency } from '@/lib/utils';
import type { LoanStatus } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LimitationTypeBadge } from './limitation-type-badge';

type InvestmentTypeWithLoans = InvestmentType & {
  loans: (Pick<Loan, 'id' | 'amount' | 'signDate'> & { status: LoanStatus })[];
  _count: { loans: number };
};

type InvestmentTypeTableRow = InvestmentTypeWithLoans & {
  metrics: InvestmentTypeMetrics;
  numberOfLoans: number;
  totalAmount: number;
  usedCapacity: number;
  freeCapacity: number;
};

interface Props {
  investmentTypes: InvestmentTypeWithLoans[];
  project: ProjectWithConfiguration;
  views: View[];
}

export function InvestmentTypesPageContent({ investmentTypes, project, views }: Props) {
  const t = useTranslations('dashboard.investmentTypes');
  const commonT = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const selectedViewName = useSelectedViewName(views);
  const limitationTypeTimePeriod = commonT('enums.limitationTypeTimePeriod.parenthesized', { months: PERIOD_MONTHS });
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(getDefaultEffectiveDate()),
  );

  const tableData = useMemo<InvestmentTypeTableRow[]>(() => {
    const effectiveDateValue = new Date(effectiveDate);

    return investmentTypes.map((investmentType) => {
      const metrics = calcInvestmentTypeMetrics(investmentType, effectiveDateValue);

      return {
        ...investmentType,
        metrics,
        numberOfLoans: metrics.numberOfLoans,
        totalAmount: calcTotalAmount(investmentType.loans),
        usedCapacity: metrics.usedCapacity,
        freeCapacity: metrics.capacityLimit - metrics.usedCapacity,
      };
    });
  }, [investmentTypes, effectiveDate]);

  const columns: ColumnDef<InvestmentTypeTableRow>[] = [
    createPercentageColumn<InvestmentTypeTableRow>('interestRate', 'table.interestRate', t, locale),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'name',
        header: 'table.name',
        accessorFn: (row) => row.name || '',
        cell: ({ row }) => row.original.name || '—',
      },
      t,
    ),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'limitationType',
        header: 'table.limitationType',
        cell: ({ row }) => <LimitationTypeBadge limitationType={row.original.limitationType} />,
        filterFn: enumFilter,
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as LimitationType;
          const b = rowB.getValue(columnId) as LimitationType;
          return commonT(`enums.limitationType.${a}`, { timePeriod: limitationTypeTimePeriod }).localeCompare(
            commonT(`enums.limitationType.${b}`, { timePeriod: limitationTypeTimePeriod }),
          );
        },
      },
      t,
    ),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'usedCapacity',
        header: 'table.usedCapacity',
        align: 'right',
        filterFn: 'inNumberRange',
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{formatCapacity(row.original.metrics, locale)}</div>
        ),
      },
      t,
    ),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'freeCapacity',
        header: 'table.freeCapacity',
        align: 'right',
        filterFn: 'inNumberRange',
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{formatFreeCapacity(row.original.metrics, locale)}</div>
        ),
      },
      t,
    ),

    createNumberColumn<InvestmentTypeTableRow>('numberOfLoans', 'table.numberOfLoans', t, locale),

    createCurrencyColumn<InvestmentTypeTableRow>('totalAmount', 'table.totalAmount', t, locale),
  ];

  const columnFilters = {
    interestRate: {
      type: 'number' as const,
      label: t('table.interestRate'),
    },
    name: {
      type: 'text' as const,
      label: t('table.name'),
    },
    limitationType: {
      type: 'select' as const,
      label: t('table.limitationType'),
      options: Object.entries(LimitationType).map(([key, value]) => ({
        label: commonT(`enums.limitationType.${key}`, { timePeriod: limitationTypeTimePeriod }),
        value,
      })),
    },
    numberOfLoans: {
      type: 'number' as const,
      label: t('table.numberOfLoans'),
    },
    totalAmount: {
      type: 'number' as const,
      label: t('table.totalAmount'),
    },
    usedCapacity: {
      type: 'number' as const,
      label: t('table.usedCapacity'),
    },
    freeCapacity: {
      type: 'number' as const,
      label: t('table.freeCapacity'),
    },
  };

  const defaultColumnVisibility = {
    interestRate: true,
    name: true,
    limitationType: true,
    numberOfLoans: true,
    totalAmount: false,
    usedCapacity: true,
    freeCapacity: true,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-0.5 text-base font-normal text-muted-foreground">
            {selectedViewName ?? t('description')}
          </p>
        </div>
        <Button asChild>
          <Link href={`/investment-types/new?projectId=${project.id}`}>
            <Plus className="w-4 h-4 mr-2" />
            {t('create')}
          </Link>
        </Button>
      </div>

      <DataTable
        fillHeight
        columns={columns}
        data={tableData}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.INVESTMENT_TYPE}
        views={views}
        showFilter={true}
        toolbarContent={
          <div className="flex items-center gap-3">
            <label htmlFor="effectiveDate" className="text-sm font-medium whitespace-nowrap">
              {t('effectiveDate')}
            </label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => {
                if (e.target.value) {
                  setEffectiveDate(e.target.value);
                }
              }}
              className="w-auto"
            />
          </div>
        }
        onRowClick={(row) => {
          router.push(`/investment-types/${row.id}?projectId=${project.id}&effectiveDate=${effectiveDate}`);
        }}
      />
    </div>
  );
}

function formatCapacity(metrics: InvestmentTypeMetrics, locale: string) {
  if (metrics.capacityUnit === 'currency') {
    return `${formatCurrency(metrics.usedCapacity, locale)} / ${formatCurrency(metrics.capacityLimit, locale)}`;
  }

  return `${metrics.usedCapacity} / ${metrics.capacityLimit}`;
}

function formatFreeCapacity(metrics: InvestmentTypeMetrics, locale: string) {
  const freeCapacity = metrics.capacityLimit - metrics.usedCapacity;

  if (metrics.capacityUnit === 'currency') {
    return formatCurrency(freeCapacity, locale);
  }

  return freeCapacity;
}
