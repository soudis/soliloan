import type { EntityFilter } from '@/types/entity-filters';

export const TABLE_VIEW_DISPLAY_MODES = ['fixed', 'paged'] as const;

export type TableViewDisplayMode = (typeof TABLE_VIEW_DISPLAY_MODES)[number];

export type TableViewSort = { columnId: string; desc: boolean } | null;

export type TableViewColumnConfig = {
  id: string;
  visible: boolean;
};

export type TableViewWidgetConfigBase = {
  layoutVersion: 1;
  columns: TableViewColumnConfig[];
  filters: EntityFilter[];
  defaultSort: TableViewSort;
  displayMode: TableViewDisplayMode;
  rowLimit: number;
};

export type LoanTableWidgetConfig = TableViewWidgetConfigBase;

export type LenderTableWidgetConfig = TableViewWidgetConfigBase;

export const TABLE_VIEW_ROW_LIMIT_MIN = 1;

export const TABLE_VIEW_ROW_LIMIT_MAX = 100;

export const DEFAULT_TABLE_VIEW_ROW_LIMIT = 10;

export const DEFAULT_LOAN_TABLE_VISIBLE_COLUMNS = [
  'lenderName',
  'signDate',
  'amount',
  'balance',
  'interestRate',
  'status',
] as const;

export const DEFAULT_LENDER_TABLE_VISIBLE_COLUMNS = ['lenderNumber', 'name', 'type', 'balance', 'amount'] as const;

function clampRowLimit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return DEFAULT_TABLE_VIEW_ROW_LIMIT;
  }
  return Math.min(TABLE_VIEW_ROW_LIMIT_MAX, Math.max(TABLE_VIEW_ROW_LIMIT_MIN, Math.round(n)));
}

function parseTableViewSort(value: unknown): TableViewSort {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const sort = value as { columnId?: unknown; desc?: unknown };
  if (typeof sort.columnId !== 'string' || !sort.columnId.trim()) {
    return null;
  }
  return { columnId: sort.columnId, desc: sort.desc === true };
}

function parseTableViewColumns(value: unknown, defaultVisibleIds: readonly string[]): TableViewColumnConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultVisibleIds.map((id) => ({ id, visible: true }));
  }
  return value
    .filter((item): item is { id: string; visible?: boolean } => {
      return Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string');
    })
    .map((item) => ({
      id: item.id,
      visible: item.visible !== false,
    }));
}

function parseEntityFilters(value: unknown): EntityFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is EntityFilter =>
    Boolean(
      item &&
        typeof item === 'object' &&
        typeof (item as EntityFilter).id === 'string' &&
        typeof (item as EntityFilter).field === 'string' &&
        ((item as EntityFilter).entity === 'loan' || (item as EntityFilter).entity === 'lender'),
    ),
  );
}

function parseTableViewConfigBase(
  config: Record<string, unknown> | undefined,
  defaultVisibleIds: readonly string[],
): TableViewWidgetConfigBase {
  const displayMode: TableViewDisplayMode = config?.displayMode === 'fixed' ? 'fixed' : 'paged';

  return {
    layoutVersion: 1,
    columns: parseTableViewColumns(config?.columns, defaultVisibleIds),
    filters: parseEntityFilters(config?.filters),
    defaultSort: parseTableViewSort(config?.defaultSort),
    displayMode,
    rowLimit: clampRowLimit(config?.rowLimit),
  };
}

export function createDefaultLoanTableConfig(): LoanTableWidgetConfig {
  return {
    layoutVersion: 1,
    columns: DEFAULT_LOAN_TABLE_VISIBLE_COLUMNS.map((id) => ({ id, visible: true })),
    filters: [],
    defaultSort: null,
    displayMode: 'paged',
    rowLimit: DEFAULT_TABLE_VIEW_ROW_LIMIT,
  };
}

export function createDefaultLenderTableConfig(): LenderTableWidgetConfig {
  return {
    layoutVersion: 1,
    columns: DEFAULT_LENDER_TABLE_VISIBLE_COLUMNS.map((id) => ({ id, visible: true })),
    filters: [],
    defaultSort: null,
    displayMode: 'paged',
    rowLimit: DEFAULT_TABLE_VIEW_ROW_LIMIT,
  };
}

export function parseLoanTableConfig(config: Record<string, unknown> | undefined): LoanTableWidgetConfig {
  return parseTableViewConfigBase(config, DEFAULT_LOAN_TABLE_VISIBLE_COLUMNS);
}

export function parseLenderTableConfig(config: Record<string, unknown> | undefined): LenderTableWidgetConfig {
  return parseTableViewConfigBase(config, DEFAULT_LENDER_TABLE_VISIBLE_COLUMNS);
}
