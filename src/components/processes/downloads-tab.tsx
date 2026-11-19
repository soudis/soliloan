'use client';

import { ExportType } from '@prisma/client';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { generateExportAction } from '@/actions/processes/mutations/generate-export';
import { getExportsAction, getExportYearAction } from '@/actions/processes/queries/get-exports';
import { useProject } from '@/components/providers/project-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { processesYearHref } from '@/lib/dashboard/notifications/notification-links';

const EXPORT_TYPES = [ExportType.YEARLY_LIST, ExportType.ACCOUNT_NOTIFICATIONS] as const;

type ExportRow = {
  id: string;
  type: ExportType;
  year: number;
  preliminary: boolean;
  fileName: string;
  createdAt: Date;
  createdBy: string | null;
};

const createdAtFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function DownloadsTab() {
  const t = useTranslations('processes.downloads');
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useQueryState('exportYear', parseAsInteger.withDefault(currentYear - 1));
  const [type, setType] = useQueryState(
    'exportType',
    parseAsStringLiteral(EXPORT_TYPES).withDefault(ExportType.YEARLY_LIST),
  );
  const [generating, setGenerating] = useState(false);

  const exportsQuery = useQuery({
    queryKey: ['exports', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const result = await getExportsAction({ projectId });
      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError ?? 'failed');
      }
      return result.data.exports as ExportRow[];
    },
  });

  const yearQuery = useQuery({
    queryKey: ['export-year', projectId, year],
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await getExportYearAction({ projectId, year });
      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError ?? 'failed');
      }
      return result.data;
    },
  });

  const minYear = yearQuery.data?.minYear ?? currentYear - 1;
  const years = useMemo(() => {
    const values: number[] = [];
    for (let value = currentYear; value >= minYear; value -= 1) values.push(value);
    return values;
  }, [minYear, currentYear]);

  const openYearlyInterest = yearQuery.data?.year === year ? yearQuery.data.openYearlyInterest : 0;

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generateExportAction({ projectId, type, year });
      if (result?.serverError || result?.validationErrors || !result?.data) {
        toast.error(t('generateError'));
        return;
      }
      toast.success(t('generated', { fileName: result.data.fileName }));
      await queryClient.invalidateQueries({ queryKey: ['exports', projectId] });
    } catch {
      toast.error(t('generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const columns = useMemo<ColumnDef<ExportRow>[]>(
    () => [
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.type')} />,
        cell: ({ row }) => t(`types.${row.original.type}`),
      },
      {
        accessorKey: 'year',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.year')} />,
      },
      {
        accessorKey: 'preliminary',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.preliminary')} />,
        cell: ({ row }) =>
          row.original.preliminary ? <Badge variant="secondary">{t('preliminary')}</Badge> : <span>–</span>,
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdBy')} />,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdAt')} />,
        cell: ({ row }) => createdAtFormat.format(new Date(row.original.createdAt)),
      },
      {
        id: 'download',
        header: () => t('columns.download'),
        cell: ({ row }) => (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/exports/${row.original.id}`} download={row.original.fileName}>
              <Download className="mr-2 h-4 w-4" />
              {row.original.fileName}
            </a>
          </Button>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-type">{t('type')}</Label>
              <Select value={type} onValueChange={(value) => void setType(value as ExportType)}>
                <SelectTrigger id="export-type" className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`types.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-year">{t('year')}</Label>
              <Select value={String(year)} onValueChange={(value) => void setYear(Number(value))}>
                <SelectTrigger id="export-year" className="h-9 w-28">
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
            <Button type="button" onClick={generate} disabled={generating || !projectId || year > currentYear}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {generating ? t('generating') : t('generate')}
            </Button>
          </div>

          {year >= currentYear ? (
            <Alert>
              <AlertTriangle />
              <AlertTitle>{t('currentYearWarning.title')}</AlertTitle>
              <AlertDescription>{t('currentYearWarning.description', { year })}</AlertDescription>
            </Alert>
          ) : null}

          {openYearlyInterest > 0 ? (
            <Alert>
              <AlertTriangle />
              <AlertTitle>{t('openInterestWarning.title', { year })}</AlertTitle>
              <AlertDescription>
                <p>{t('openInterestWarning.description', { count: openYearlyInterest, year })}</p>
                <Link href={processesYearHref(projectId, year)} className="font-medium underline underline-offset-4">
                  {t('openInterestWarning.link')}
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={exportsQuery.data ?? []}
        getRowId={(row) => row.id}
        hideHeader
        showColumnVisibility={false}
        showFilter={false}
        isLoading={exportsQuery.isPending}
        emptyMessage={exportsQuery.isError ? t('error') : t('empty')}
      />
    </div>
  );
}
