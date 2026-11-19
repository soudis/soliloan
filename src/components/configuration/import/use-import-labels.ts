'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { ImportSystemColumn } from '@/lib/import/system-columns';
import type { ImportIssue } from '@/lib/import/types';

const ENUM_LABEL_PATHS: Record<string, string> = {
  'lender.type': 'enums.lender.type',
  'lender.salutation': 'enums.lender.salutation',
  'lender.notificationType': 'enums.lender.notificationType',
  'loan.interestPaymentType': 'enums.loan.interestPaymentType',
  'loan.interestMethod': 'enums.interestMethod',
  'loan.contractStatus': 'enums.loan.contractStatus',
  'loan.terminationType': 'enums.loan.terminationType',
  'loan.terminationPeriodType': 'enums.loan.durationUnit',
  'loan.durationType': 'enums.loan.durationUnit',
};

/** Labels of system columns, their options and validation messages. */
export function useImportLabels(columns: ImportSystemColumn[]) {
  const t = useTranslations('dashboard.configuration.import');
  const commonT = useTranslations('common');
  const byKey = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);

  const columnLabel = useCallback(
    (key: string) => {
      const column = byKey.get(key);
      if (column?.additionalField) return column.additionalField.config.name;
      return t.has(`columns.${key}`) ? t(`columns.${key}`) : key;
    },
    [byKey, t],
  );

  const optionLabel = useCallback(
    (key: string, value: string) => {
      const column = byKey.get(key);
      if (column?.kind === 'boolean') return commonT(value === 'true' ? 'ui.boolean.yes' : 'ui.boolean.no');
      if (key === 'lender.country') {
        const path = `countries.${value.toLowerCase()}`;
        return commonT.has(path) ? commonT(path) : value;
      }
      const base = ENUM_LABEL_PATHS[key];
      if (base && commonT.has(`${base}.${value}`)) return commonT(`${base}.${value}`);
      return value;
    },
    [byKey, commonT],
  );

  const issueText = useCallback(
    (issue: ImportIssue, withColumn = true) => {
      const message = t.has(`issues.${issue.code}`) ? t(`issues.${issue.code}`, issue.params ?? {}) : issue.code;
      return withColumn && issue.column ? `${columnLabel(issue.column)}: ${message}` : message;
    },
    [columnLabel, t],
  );

  return { columnLabel, optionLabel, issueText };
}
