'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';

import { getYearlyInterestPayoutAction } from '@/actions/processes/queries/get-yearly-interest-payout';
import { YearlyInterestWizard } from '@/components/processes/yearly-interest-wizard';
import { Button } from '@/components/ui/button';
import type { BulkAction } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { buildYearlyInterestPayoutHref } from '@/lib/processes/yearly-interest-link';
import type { YearlyInterestLoanView } from '@/lib/processes/yearly-interest-view';
import { formatCurrency, formatPercentage } from '@/lib/utils';

export function YearlyInterestTab() {
  const t = useTranslations('processes.yearlyInterest');
  const projectId = useProjectId();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useQueryState('year', parseAsInteger.withDefault(currentYear));
  const [wizardLoans, setWizardLoans] = useState<YearlyInterestLoanView[] | null>(null);

  const query = useQuery({
    queryKey: ['yearly-interest', projectId, year],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('missing project');
      const result = await getYearlyInterestPayoutAction({ projectId, year });
      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError ?? 'failed');
      }
      return result.data;
    },
  });

  const loans = query.data?.loans ?? [];
  const minYear = query.data?.minYear ?? currentYear;
  const maxYear = query.data?.maxYear ?? currentYear;
  const years = useMemo(() => {
    const values: number[] = [];
    for (let value = minYear; value <= maxYear; value += 1) values.push(value);
    if (!values.includes(year)) values.push(year);
    return values.sort((a, b) => a - b);
  }, [minYear, maxYear, year]);

  const columns = useMemo<ColumnDef<YearlyInterestLoanView>[]>(
    () => [
      {
        id: 'loanNumber',
        accessorKey: 'loanNumber',
        header: t('columns.loanNumber'),
      },
      {
        id: 'lender',
        accessorFn: (row) => row.lender.name,
        header: t('columns.lender'),
      },
      {
        id: 'interestRate',
        accessorKey: 'interestRate',
        header: t('columns.interestRate'),
        cell: ({ row }) => formatPercentage(row.original.interestRate),
      },
      {
        id: 'unpaid',
        accessorKey: 'unpaid',
        header: t('columns.unpaid'),
        meta: { style: { textAlign: 'right' } },
        cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.unpaid)}</div>,
      },
    ],
    [t],
  );

  const bulkActions: BulkAction[] = [
    {
      label: t('assistant'),
      icon: <Wand2 className="h-4 w-4" />,
      onClick: (ids) => {
        setWizardLoans(loans.filter((loan) => ids.includes(loan.id)));
      },
    },
  ];

  if (!projectId) return null;

  return (
    <div className="space-y-4">
      {query.isLoading ? <p className="text-sm text-muted-foreground">{t('loading')}</p> : null}
      {query.isError ? <p className="text-sm text-destructive">{t('error')}</p> : null}

      <DataTable
        columns={columns}
        data={loans}
        bulkActions={bulkActions}
        getRowId={(row) => row.id}
        showFilter={false}
        showColumnVisibility={false}
        toolbarAlign="start"
        toolbarContent={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('year')}</span>
              <Select value={String(year)} onValueChange={(value) => void setYear(Number(value))}>
                <SelectTrigger className="w-28">
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
            </div>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
            {query.data && query.data.payoutCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(buildYearlyInterestPayoutHref(projectId, year))}
              >
                {t('openPayouts', { year })}
              </Button>
            ) : null}
          </div>
        }
      />
      {query.isSuccess && loans.length === 0 ? <p className="text-sm text-muted-foreground">{t('empty')}</p> : null}

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
