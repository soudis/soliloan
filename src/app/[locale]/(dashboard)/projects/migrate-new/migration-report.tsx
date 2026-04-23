'use client';

import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatMigrationReportAsPlainText } from '@/lib/migration/format-report';
import type { MigrationReport } from '@/lib/migration/types';

interface MigrationReportViewProps {
  report: MigrationReport;
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="flex items-center justify-between w-full p-4 text-left font-medium"
        onClick={() => setOpen(!open)}
      >
        <span>
          {title} {count !== undefined && <span className="text-muted-foreground">({count})</span>}
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function MigrationReportView({ report }: MigrationReportViewProps) {
  const t = useTranslations('dashboard.migration');

  const handleDownload = useCallback(() => {
    const text = formatMigrationReportAsPlainText(report, t);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-report-${report.projectSlug ?? 'unknown'}-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report, t]);

  if (!report.success) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-destructive mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">{t('report.failed')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('report.rolledBack')}</p>
            {report.error && (
              <pre className="mt-4 p-4 bg-muted rounded-md text-sm overflow-x-auto whitespace-pre-wrap break-all">
                {report.error}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-500 bg-green-500/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">{t('report.success')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('report.projectCreated', { slug: report.projectSlug ?? '' })}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <CollapsibleSection title={t('report.summary')} defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(report.counts).map(([key, value]) => (
            <div key={key} className="bg-muted rounded-md p-3">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{t(`report.counts.${key}`)}</div>
            </div>
          ))}
        </div>
        {report.skippedFiles > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('report.skippedFiles', { count: report.skippedFiles })}
          </p>
        )}
      </CollapsibleSection>

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <CollapsibleSection title={t('report.warnings')} count={report.warnings.length}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {report.warnings.map((warning) => (
              <div
                key={`w-${warning.entity}-${warning.legacyId}-${warning.message.slice(0, 20)}`}
                className="text-sm bg-yellow-500/10 rounded p-2 flex gap-2"
              >
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {warning.entity}#{warning.legacyId}
                </span>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ID Mappings */}
      {report.idMappings.length > 0 && (
        <CollapsibleSection title={t('report.idMappings')} count={report.idMappings.length}>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">{t('report.table.entity')}</th>
                  <th className="text-left p-2">{t('report.table.legacyId')}</th>
                  <th className="text-left p-2">{t('report.table.newNumber')}</th>
                  <th className="text-left p-2">{t('report.table.newId')}</th>
                </tr>
              </thead>
              <tbody>
                {report.idMappings.map((mapping) => (
                  <tr key={`m-${mapping.entity}-${mapping.legacyId}`} className="border-b">
                    <td className="p-2 font-mono text-xs">{mapping.entity}</td>
                    <td className="p-2">{mapping.legacyId}</td>
                    <td className="p-2">{mapping.displayNumber ?? '-'}</td>
                    <td className="p-2 font-mono text-xs truncate max-w-[200px]">{mapping.newId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {/* Unmapped fields */}
      {report.unmappedFields.length > 0 && (
        <CollapsibleSection title={t('report.unmappedFields')} count={report.unmappedFields.length}>
          <ul className="list-disc list-inside text-sm space-y-1">
            {report.unmappedFields.map((field) => (
              <li key={field} className="font-mono text-xs">
                {field}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      <Button variant="outline" onClick={handleDownload}>
        <Download className="mr-2 h-4 w-4" />
        {t('report.downloadReport')}
      </Button>
    </div>
  );
}
