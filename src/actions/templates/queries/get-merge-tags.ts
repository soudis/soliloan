'use server';

import type { TemplateDataset, TemplateType } from '@prisma/client';
import { getTranslations } from 'next-intl/server';

import { db } from '@/lib/db';
import {
  DATASET_CONFIGS,
  LENDER_FIELDS,
  LOAN_FIELDS,
  LOOP_DEFINITIONS,
  NOTE_FIELDS,
  TRANSACTION_FIELDS,
  buildLoopTags,
  buildMergeTagValue,
} from '@/lib/templates/merge-tags';

export type MergeTagField = {
  key: string;
  label: string;
  value: string;
  entity: string;
};

export type MergeTagLoop = {
  key: string;
  label: string;
  startTag: string;
  endTag: string;
  childPrefix: string;
  parentRequired?: string;
  childFields: MergeTagField[];
  childLoops?: string[];
};

export type MergeTagConfig = {
  topLevelFields: MergeTagField[];
  loops: MergeTagLoop[];
  additionalFields: {
    lender: MergeTagField[];
    loan: MergeTagField[];
  };
};

type AdditionalFieldDef = {
  name: string;
  type: string;
  label?: string;
};

/**
 * Get merge tag configuration for a dataset with translated labels
 */
export async function getMergeTagConfigAction(dataset: TemplateDataset, projectId?: string, templateType?: TemplateType): Promise<MergeTagConfig> {
  const t = await getTranslations('fields');

  const config = DATASET_CONFIGS[dataset];

  // Build top-level fields
  const topLevelFields: MergeTagField[] = [];
  for (const { entity, fields } of config.topLevelFields) {
    for (const field of fields) {
      topLevelFields.push({
        key: `${entity}.${field}`,
        label: t(`${entity}.${field}`),
        value: buildMergeTagValue(entity, field),
        entity,
      });
    }
  }

  // Build loops with child fields
  const loops: MergeTagLoop[] = [];
  for (const loopKey of config.loops) {
    const loopDef = LOOP_DEFINITIONS[loopKey];
    if (!loopDef) continue;

    const tags = buildLoopTags(loopDef.key);
    const childFields: MergeTagField[] = [];

    for (const field of loopDef.availableFields) {
      childFields.push({
        key: `${loopDef.childPrefix}.${field}`,
        label: t(`${loopDef.childPrefix}.${field}`),
        value: buildMergeTagValue(loopDef.childPrefix, field),
        entity: loopDef.childPrefix,
      });
    }

    loops.push({
      key: loopDef.key,
      label: t(loopDef.labelKey),
      startTag: tags.start,
      endTag: tags.end,
      childPrefix: loopDef.childPrefix,
      parentRequired: loopDef.parentRequired,
      childFields,
      childLoops: loopDef.childLoops,
    });
  }

  // Add nested loops (transactions inside loans, notes inside loans)
  if (dataset === 'LENDER') {
    // Transaction loop (inside loans)
    const transactionDef = LOOP_DEFINITIONS.transactions;
    if (transactionDef) {
      const tags = buildLoopTags(transactionDef.key);
      loops.push({
        key: 'transactions',
        label: t(transactionDef.labelKey),
        startTag: tags.start,
        endTag: tags.end,
        childPrefix: 'transaction',
        parentRequired: 'loans',
        childFields: TRANSACTION_FIELDS.map((field) => ({
          key: `transaction.${field}`,
          label: t(`transaction.${field}`),
          value: buildMergeTagValue('transaction', field),
          entity: 'transaction',
        })),
      });
    }

    // Loan notes loop (inside loans)
    loops.push({
      key: 'loanNotes',
      label: `${t('loops.notes')} (Darlehen)`,
      startTag: '{{#notes}}',
      endTag: '{{/notes}}',
      childPrefix: 'note',
      parentRequired: 'loans',
      childFields: NOTE_FIELDS.map((field) => ({
        key: `note.${field}`,
        label: t(`note.${field}`),
        value: buildMergeTagValue('note', field),
        entity: 'note',
      })),
    });
  }

  // Get additional fields from project config if projectId provided
  const additionalFields: MergeTagConfig['additionalFields'] = {
    lender: [],
    loan: [],
  };

  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        configuration: {
          select: {
            lenderAdditionalFields: true,
            loanAdditionalFields: true,
          },
        },
      },
    });

    if (project?.configuration) {
      // Parse lender additional fields
      const lenderAddFields = project.configuration.lenderAdditionalFields as AdditionalFieldDef[];
      if (Array.isArray(lenderAddFields)) {
        for (const field of lenderAddFields) {
          additionalFields.lender.push({
            key: `lender.additionalFields.${field.name}`,
            label: field.label || field.name,
            value: `{{lender.additionalFields.${field.name}}}`,
            entity: 'lender',
          });
        }
      }

      // Parse loan additional fields
      const loanAddFields = project.configuration.loanAdditionalFields as AdditionalFieldDef[];
      if (Array.isArray(loanAddFields)) {
        for (const field of loanAddFields) {
          additionalFields.loan.push({
            key: `loan.additionalFields.${field.name}`,
            label: field.label || field.name,
            value: `{{loan.additionalFields.${field.name}}}`,
            entity: 'loan',
          });
        }
      }
    }
  }

  // For document templates, add page number merge tags
  if (templateType === 'DOCUMENT') {
    topLevelFields.push(
      {
        key: 'page.pageNumber',
        label: t('page.pageNumber'),
        value: '{{pageNumber}}',
        entity: 'page',
      },
      {
        key: 'page.totalPages',
        label: t('page.totalPages'),
        value: '{{totalPages}}',
        entity: 'page',
      },
    );
  }

  return {
    topLevelFields,
    loops,
    additionalFields,
  };
}
