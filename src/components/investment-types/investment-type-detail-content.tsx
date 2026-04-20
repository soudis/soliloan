'use client';

import type { InvestmentType, Lender, Loan } from '@prisma/client';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteInvestmentTypeAction } from '@/actions/investment-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from '@/i18n/navigation';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import { getLenderName } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';

type InvestmentTypeWithRelations = InvestmentType & {
  loans: (Loan & { lender: Lender })[];
  _count: { loans: number };
};

interface Props {
  investmentType: InvestmentTypeWithRelations;
  project: ProjectWithConfiguration;
}

export function InvestmentTypeDetailContent({ investmentType, project }: Props) {
  const t = useTranslations('dashboard.investmentTypes');
  const commonT = useTranslations('common');
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [effectiveDate, setEffectiveDate] = useQueryState(
    'effectiveDate',
    parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd')),
  );

  const { executeAsync: deleteAction, isExecuting: isDeleting } = useAction(deleteInvestmentTypeAction);

  const limitationLabel = (type: InvestmentType['limitationType']) => {
    if (type === 'NOT_MORE_THAN_N_UNITS') {
      return commonT('enums.limitationType.NOT_MORE_THAN_N_UNITS', { limit: MAX_UNITS });
    }
    return commonT('enums.limitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD', {
      limit: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(MAX_TOTAL_AMOUNT_EUR),
      timePeriod: `${PERIOD_MONTHS} Monate`,
    });
  };

  const handleDelete = async () => {
    const result = await deleteAction({ projectId: project.id, investmentTypeId: investmentType.id });
    if (result?.serverError) {
      toast.error(t('detail.deleteError'));
    } else {
      toast.success(t('detail.deleteSuccess'));
      router.push(`/investment-types?projectId=${project.id}`);
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {investmentType.name || t('detail.title')}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary">{limitationLabel(investmentType.limitationType)}</Badge>
            <span className="text-muted-foreground">{investmentType.interestRate}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/investment-types/${investmentType.id}/edit?projectId=${project.id}`}>
              <Pencil className="w-4 h-4 mr-2" />
              {t('detail.edit')}
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('detail.delete')}
          </Button>
        </div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t('table.numberOfLoans')}</p>
          <p className="text-2xl font-bold">{investmentType._count.loans}</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t('table.totalAmount')}</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t('table.capacity')}</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('detail.loans')}</h2>
        {investmentType.loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detail.noLoans')}</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.loanNumber')}</TableHead>
                  <TableHead>{t('detail.lender')}</TableHead>
                  <TableHead className="text-right">{t('detail.amount')}</TableHead>
                  <TableHead className="text-right">{t('detail.interestRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentType.loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Link
                        href={`/loans/${loan.id}/edit?projectId=${project.id}`}
                        className="font-medium hover:underline"
                      >
                        #{loan.loanNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{getLenderName(loan.lender)}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(loan.amount)}
                    </TableCell>
                    <TableCell className="text-right">{loan.interestRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail.confirmDeleteDescription', { count: investmentType._count.loans })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{commonT('ui.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('detail.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
