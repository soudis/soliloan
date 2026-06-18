import { z } from 'zod';

import {
  DEFAULT_LOAN_TABLE_VISIBLE_COLUMNS,
  DEFAULT_TABLE_VIEW_ROW_LIMIT,
  TABLE_VIEW_DISPLAY_MODES,
  TABLE_VIEW_ROW_LIMIT_MAX,
  TABLE_VIEW_ROW_LIMIT_MIN,
} from '@/types/dashboard-widgets/table-view';

import { entityFiltersSchema } from './shared';

const tableViewSortSchema = z
  .object({
    columnId: z.string().min(1),
    desc: z.boolean(),
  })
  .nullable()
  .default(null);

const tableViewColumnSchema = z.object({
  id: z.string().min(1),
  visible: z.boolean().default(true),
});

export const loanTableWidgetConfigSchema = z.object({
  layoutVersion: z.literal(1).default(1),
  columns: z
    .array(tableViewColumnSchema)
    .min(1)
    .max(200)
    .default(DEFAULT_LOAN_TABLE_VISIBLE_COLUMNS.map((id) => ({ id, visible: true }))),
  filters: entityFiltersSchema,
  defaultSort: tableViewSortSchema,
  displayMode: z.enum(TABLE_VIEW_DISPLAY_MODES).default('paged'),
  rowLimit: z
    .number()
    .int()
    .min(TABLE_VIEW_ROW_LIMIT_MIN)
    .max(TABLE_VIEW_ROW_LIMIT_MAX)
    .default(DEFAULT_TABLE_VIEW_ROW_LIMIT),
});
