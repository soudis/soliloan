'use client';

import type { TransactionType } from '@prisma/client';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BankImportProtocol } from '@/lib/gocardless/import-protocol';
import { formatCurrency } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocol: BankImportProtocol | null;
};

export function BankImportProtocolDialog({ open, onOpenChange, protocol }: Props) {
  const t = useTranslations('dashboard.transactions.import.protocol');
  const commonT = useTranslations('common');
  const format = useFormatter();

  if (!protocol) {
    return null;
  }

  const formatDate = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });

  const formatType = (type: TransactionType) => commonT(`enums.transaction.type.${type}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t('title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('summary', { imported: protocol.importedCount, skipped: protocol.skippedCount })}
          </p>
        </DialogHeader>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto">
          <div className="space-y-6 px-6 py-4">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                <h3 className="font-medium">{t('importedSection', { count: protocol.importedCount })}</h3>
              </div>
              {protocol.imported.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('importedEmpty')}</p>
              ) : (
                <ProtocolTable
                  rows={protocol.imported.map((row) => ({
                    key: row.rowId,
                    date: formatDate(row.bookingDate),
                    counterparty: row.counterpartyName ?? '—',
                    amount: `${formatCurrency(row.amount)} ${row.currency}`,
                    detail: t('importedDetail', {
                      loanNumber: row.loanNumber,
                      lenderName: row.lenderName,
                      type: formatType(row.type),
                    }),
                    status: null,
                  }))}
                  t={t}
                />
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h3 className="font-medium">{t('skippedSection', { count: protocol.skippedCount })}</h3>
              </div>
              {protocol.skipped.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('skippedEmpty')}</p>
              ) : (
                <ProtocolTable
                  rows={protocol.skipped.map((row) => ({
                    key: row.rowId,
                    date: formatDate(row.bookingDate),
                    counterparty: row.counterpartyName ?? '—',
                    amount: `${formatCurrency(row.amount)} ${row.currency}`,
                    detail: row.remittanceInfo ?? '—',
                    status: t(`skipReasons.${row.reason}`),
                  }))}
                  t={t}
                  showReason
                />
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProtocolTable({
  rows,
  t,
  showReason = false,
}: {
  rows: {
    key: string;
    date: string;
    counterparty: string;
    amount: string;
    detail: string;
    status: string | null;
  }[];
  t: ReturnType<typeof useTranslations<'dashboard.transactions.import.protocol'>>;
  showReason?: boolean;
}) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.date')}</TableHead>
            <TableHead>{t('columns.counterparty')}</TableHead>
            <TableHead className="text-right">{t('columns.amount')}</TableHead>
            <TableHead>{showReason ? t('columns.reason') : t('columns.result')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="whitespace-nowrap">{row.date}</TableCell>
              <TableCell className="max-w-[180px] truncate">{row.counterparty}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{row.amount}</TableCell>
              <TableCell className="max-w-[280px]">
                {showReason && row.status ? (
                  <Badge variant="destructive">{row.status}</Badge>
                ) : (
                  <span className="text-sm">{row.detail}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
