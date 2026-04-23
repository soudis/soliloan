'use client';

import { type InvestmentType, LimitationType, type Loan, type View, ViewType } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import {
  calcInvestmentTypeMetrics,
  calcTotalAmount,
  type InvestmentTypeMetrics,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import {
  createColumn,
  createCurrencyColumn,
  createNumberColumn,
  createPercentageColumn,
  enumFilter,
} from '@/lib/table-column-utils';
import { formatCurrency } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import { LimitationTypeBadge } from './limitation-type-badge';

const LIMITATION_TYPE_TIME_PERIOD = `(${PERIOD_MONTHS} Monate)`;

type InvestmentTypeWithLoans = InvestmentType & {
  loans: Pick<Loan, 'id' | 'amount' | 'signDate'>[];
  _count: { loans: number };
};

type InvestmentTypeTableRow = InvestmentTypeWithLoans & {
  metrics: InvestmentTypeMetrics;
  numberOfLoans: number;
  numberOfEffectiveLoans: number;
  totalAmount: number;
  totalAmountWithinTimeframe: number | null;
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
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd')),
  );

  const tableData = useMemo<InvestmentTypeTableRow[]>(() => {
    const effectiveDateValue = new Date(effectiveDate);

    return investmentTypes.map((investmentType) => {
      const metrics = calcInvestmentTypeMetrics(investmentType, effectiveDateValue);

      return {
        ...investmentType,
        metrics,
        numberOfLoans: metrics.numberOfLoans,
        numberOfEffectiveLoans: metrics.effectiveLoans.length,
        totalAmount: calcTotalAmount(investmentType.loans),
        totalAmountWithinTimeframe:
          investmentType.limitationType === LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD ? metrics.usedCapacity : null,
        usedCapacity: metrics.usedCapacity,
        freeCapacity: metrics.capacityLimit - metrics.usedCapacity,
      };
    });
  }, [investmentTypes, effectiveDate]);

  const columns: ColumnDef<InvestmentTypeTableRow>[] = [
    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'name',
        header: 'table.name',
        accessorFn: (row) => row.name || '',
        cell: ({ row }) => row.original.name || '—',
      },
      t,
    ),

    createPercentageColumn<InvestmentTypeTableRow>('interestRate', 'table.interestRate', t, locale),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'usedCapacity',
        header: 'table.capacity',
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

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'limitationType',
        header: 'table.limitationType',
        cell: ({ row }) => <LimitationTypeBadge limitationType={row.original.limitationType} />,
        filterFn: enumFilter,
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as LimitationType;
          const b = rowB.getValue(columnId) as LimitationType;
          return commonT(`enums.limitationType.${a}`, { timePeriod: LIMITATION_TYPE_TIME_PERIOD }).localeCompare(
            commonT(`enums.limitationType.${b}`, { timePeriod: LIMITATION_TYPE_TIME_PERIOD }),
          );
        },
      },
      t,
    ),

    createNumberColumn<InvestmentTypeTableRow>('numberOfLoans', 'table.numberOfLoans', t, locale),

    createNumberColumn<InvestmentTypeTableRow>('numberOfEffectiveLoans', 'table.numberOfEffectiveLoans', t, locale),

    createCurrencyColumn<InvestmentTypeTableRow>('totalAmount', 'table.totalAmount', t, locale),

    createColumn<InvestmentTypeTableRow>(
      {
        accessorKey: 'totalAmountWithinTimeframe',
        header: 'table.totalAmountWithinTimeframe',
        align: 'right',
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.totalAmountWithinTimeframe;
          return <div className="text-right tabular-nums">{value === null ? '—' : formatCurrency(value, locale)}</div>;
        },
      },
      t,
    ),
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
        label: commonT(`enums.limitationType.${key}`, { timePeriod: LIMITATION_TYPE_TIME_PERIOD }),
        value,
      })),
    },
    numberOfLoans: {
      type: 'number' as const,
      label: t('table.numberOfLoans'),
    },
    numberOfEffectiveLoans: {
      type: 'number' as const,
      label: t('table.numberOfEffectiveLoans'),
    },
    totalAmount: {
      type: 'number' as const,
      label: t('table.totalAmount'),
    },
    totalAmountWithinTimeframe: {
      type: 'number' as const,
      label: t('table.totalAmountWithinTimeframe'),
    },
    usedCapacity: {
      type: 'number' as const,
      label: t('table.capacity'),
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
    numberOfLoans: false,
    numberOfEffectiveLoans: false,
    totalAmount: false,
    totalAmountWithinTimeframe: false,
    usedCapacity: true,
    freeCapacity: true,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href={`/investment-types/new?projectId=${project.id}`}>
            <Plus className="w-4 h-4 mr-2" />
            {t('create')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-end gap-3">
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

      <DataTable
        columns={columns}
        data={tableData}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        viewType={ViewType.INVESTMENT_TYPE}
        views={views}
        showFilter={true}
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
