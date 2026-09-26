'use client';

import { useTranslations } from 'next-intl';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type SepaSkippedRow = {
  id: string;
  lenderName: string;
  loans: string;
  reason: string;
};

export function SepaSkippedTable({ rows }: { rows: SepaSkippedRow[] }) {
  const t = useTranslations('processes.sepa');

  return (
    <Table containerClassName="max-h-80 rounded-md border border-border">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 z-10 bg-background">{t('skippedColumns.lender')}</TableHead>
          <TableHead className="sticky top-0 z-10 bg-background">{t('skippedColumns.loan')}</TableHead>
          <TableHead className="sticky top-0 z-10 bg-background">{t('skippedColumns.reason')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.lenderName}</TableCell>
            <TableCell className="whitespace-nowrap">{row.loans}</TableCell>
            <TableCell>{row.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
