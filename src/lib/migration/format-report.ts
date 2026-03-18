import type { MigrationReport } from './types';

type TranslateFunction = (key: string, values?: Record<string, string | number>) => string;

export function formatMigrationReportAsPlainText(
  report: MigrationReport,
  t: TranslateFunction
): string {
  const lines: string[] = [];

  const title = t('report.success');
  lines.push(title);
  lines.push('='.repeat(title.length));
  lines.push('');
  lines.push(t('report.projectCreated', { slug: report.projectSlug ?? '' }));
  lines.push('');

  const summaryTitle = t('report.summary');
  lines.push(summaryTitle);
  lines.push('-'.repeat(summaryTitle.length));

  const countKeys = Object.keys(report.counts) as (keyof typeof report.counts)[];
  const maxLabelLen = Math.max(...countKeys.map((key) => t(`report.counts.${key}`).length));

  for (const key of countKeys) {
    const label = t(`report.counts.${key}`);
    lines.push(`${label.padEnd(maxLabelLen + 2)}${report.counts[key]}`);
  }

  if (report.skippedFiles > 0) {
    lines.push('');
    lines.push(t('report.skippedFiles', { count: report.skippedFiles }));
  }

  if (report.warnings.length > 0) {
    lines.push('');
    const warningsTitle = `${t('report.warnings')} (${report.warnings.length})`;
    lines.push(warningsTitle);
    lines.push('-'.repeat(warningsTitle.length));

    for (const warning of report.warnings) {
      lines.push(`${warning.entity}#${warning.legacyId}: ${warning.message}`);
    }
  }

  if (report.idMappings.length > 0) {
    lines.push('');
    const mappingsTitle = `${t('report.idMappings')} (${report.idMappings.length})`;
    lines.push(mappingsTitle);
    lines.push('-'.repeat(mappingsTitle.length));

    const headers = [
      t('report.table.entity'),
      t('report.table.legacyId'),
      t('report.table.newNumber'),
      t('report.table.newId'),
    ];

    const colWidths = headers.map((h, i) => {
      const dataWidths = report.idMappings.map((m) => {
        const values = [m.entity, String(m.legacyId), String(m.displayNumber ?? '-'), m.newId];
        return values[i].length;
      });
      return Math.max(h.length, ...dataWidths);
    });

    lines.push(headers.map((h, i) => h.padEnd(colWidths[i])).join('  '));

    for (const mapping of report.idMappings) {
      const values = [
        mapping.entity,
        String(mapping.legacyId),
        String(mapping.displayNumber ?? '-'),
        mapping.newId,
      ];
      lines.push(values.map((v, i) => v.padEnd(colWidths[i])).join('  '));
    }
  }

  if (report.unmappedFields.length > 0) {
    lines.push('');
    const unmappedTitle = `${t('report.unmappedFields')} (${report.unmappedFields.length})`;
    lines.push(unmappedTitle);
    lines.push('-'.repeat(unmappedTitle.length));

    for (const field of report.unmappedFields) {
      lines.push(`- ${field}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
