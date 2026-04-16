'use client';

import type { InvestmentType } from '@prisma/client';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import type { ProjectWithConfiguration } from '@/types/projects';

type InvestmentTypeWithCount = InvestmentType & { _count: { loans: number } };

interface Props {
  investmentTypes: InvestmentTypeWithCount[];
  project: ProjectWithConfiguration;
}

export function InvestmentTypesPageContent({ investmentTypes, project }: Props) {
  const t = useTranslations('dashboard.investmentTypes');
  const commonT = useTranslations('common');
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd')),
  );

  const limitationLabel = (type: InvestmentType['limitationType']) => {
    if (type === 'NOT_MORE_THAN_N_UNITS') {
      return commonT('enums.limitationType.NOT_MORE_THAN_N_UNITS', { limit: MAX_UNITS });
    }
    return commonT('enums.limitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD', {
      limit: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(MAX_TOTAL_AMOUNT_EUR),
      timePeriod: `${PERIOD_MONTHS} Monate`,
    });
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

      <div className="flex items-center gap-3">
        <label htmlFor="effectiveDate" className="text-sm font-medium whitespace-nowrap">
          {t('effectiveDate')}
        </label>
        <Input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.limitationType')}</TableHead>
              <TableHead className="text-right">{t('table.interestRate')}</TableHead>
              <TableHead className="text-right">{t('table.numberOfLoans')}</TableHead>
              <TableHead className="text-right">{t('table.totalAmount')}</TableHead>
              <TableHead className="text-right">{t('table.capacity')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investmentTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('description')}
                </TableCell>
              </TableRow>
            ) : (
              investmentTypes.map((it) => (
                <TableRow key={it.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/investment-types/${it.id}?projectId=${project.id}`}
                      className="block w-full font-medium hover:underline"
                    >
                      {it.name || '—'}
                    </Link>
                  </TableCell>
                  <TableCell>{limitationLabel(it.limitationType)}</TableCell>
                  <TableCell className="text-right">{it.interestRate}%</TableCell>
                  <TableCell className="text-right">{it._count.loans}</TableCell>
                  <TableCell className="text-right">0</TableCell>
                  <TableCell className="text-right">0</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
