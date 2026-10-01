'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { buildTemplateConditionFields } from '@/lib/templates/template-condition-fields';
import type { ConditionSummaryLabels } from '@/lib/templates/template-condition-summary';
import { formatTemplateConditionSummary } from '@/lib/templates/template-condition-summary';
import { useMergeTagConfig } from '../merge-tag-context';

export function useTemplateConditionSummary(showIf: unknown): string {
  const t = useTranslations('templates.editor.conditions');
  const tNumber = useTranslations('dataTable.numberFilterOperators');
  const tText = useTranslations('dataTable.textFilterOperators');
  const tEnum = useTranslations('dataTable.enumFilterOperators');
  const tDate = useTranslations('dataTable.dateFilterOperators');
  const tCommon = useTranslations('common');
  const config = useMergeTagConfig();

  const fields = useMemo(() => {
    const loops = config?.loops.map((loop) => loop.key) ?? [];
    return buildTemplateConditionFields(config, loops, tCommon, t);
  }, [config, t, tCommon]);

  const labels = useMemo<ConditionSummaryLabels>(
    () => ({
      join: t('summaryJoin'),
      yes: tCommon('ui.boolean.yes'),
      no: tCommon('ui.boolean.no'),
      operators: {
        number: {
          between: tNumber('between'),
          eq: tNumber('eq'),
          gt: tNumber('gt'),
          lt: tNumber('lt'),
          gte: tNumber('gte'),
          lte: tNumber('lte'),
          empty: tNumber('empty'),
          notEmpty: tNumber('notEmpty'),
        },
        text: {
          contains: tText('contains'),
          startsWith: tText('startsWith'),
          endsWith: tText('endsWith'),
          eq: tText('eq'),
          empty: tText('empty'),
          notEmpty: tText('notEmpty'),
        },
        enum: {
          eq: tEnum('eq'),
          in: tEnum('in'),
          empty: tEnum('empty'),
          notEmpty: tEnum('notEmpty'),
        },
        date: {
          between: tDate('between'),
          olderThan: tDate('olderThan'),
          newerThan: tDate('newerThan'),
          thisMonth: tDate('thisMonth'),
          lastMonth: tDate('lastMonth'),
          thisYear: tDate('thisYear'),
          lastYear: tDate('lastYear'),
          last: tDate('last'),
          next: tDate('next'),
          year: tDate('year'),
          empty: tDate('empty'),
          notEmpty: tDate('notEmpty'),
        },
      },
      between: (start, end) => t('summaryBetween', { start, end }),
      from: (value) => t('summaryFrom', { value }),
      until: (value) => t('summaryUntil', { value }),
      duration: (count, unit) => tCommon(unit === 'days' ? 'duration.days' : 'duration.months', { count }),
      relative: {
        last: (span) => t('summaryLast', { span }),
        next: (span) => t('summaryNext', { span }),
        olderThan: (span) => t('summaryOlderThan', { span }),
        newerThan: (span) => t('summaryNewerThan', { span }),
      },
    }),
    [t, tCommon, tDate, tEnum, tNumber, tText],
  );

  return useMemo(() => formatTemplateConditionSummary(showIf, fields, labels), [fields, labels, showIf]);
}
