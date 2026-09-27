import type { DataTableColumnFilterType } from '@/lib/entity-filters/filter-definitions';
import { type FilterMatchOptions, matchesFilterByType } from '@/lib/entity-filters/filter-matchers';
import { FIELD_TYPES } from '@/lib/templates/merge-tags';

/** Parallel raw tree stored on merge data. Not a merge tag. */
export const TEMPLATE_RAW_KEY = '__raw';

export type TemplateConditionRule = {
  id: string;
  field: string;
  type: DataTableColumnFilterType;
  value: unknown;
};

/** Flat AND list. Empty means the block or branch is always shown. */
export type TemplateCondition = TemplateConditionRule[];

const FILTER_TYPES = new Set<DataTableColumnFilterType>([
  'text',
  'select',
  'multi-select',
  'number',
  'date',
  'boolean',
]);

const DISPLAY_ONLY_FIELDS = new Set([
  'lender.fullName',
  'lender.salutationText',
  'lender.fullAddress',
  'config.fullAddress',
  'loan.savingsSummary',
  'loan.savingsPaymentStatus',
  'page.pageNumber',
  'page.totalPages',
]);

const IF_OPEN = /\{\{#if:([A-Za-z0-9_-]*)\}\}/g;
const ELSE_MARK = '{{else}}';
const END_MARK = '{{/if}}';

function isFilterType(value: unknown): value is DataTableColumnFilterType {
  return typeof value === 'string' && FILTER_TYPES.has(value as DataTableColumnFilterType);
}

/** Map a merge-tag path to a filter type. Display-only tags and date twins return null. */
export function conditionFilterType(field: string): DataTableColumnFilterType | null {
  if (DISPLAY_ONLY_FIELDS.has(field)) return null;
  if (field === 'misc.dateLong') return null;
  if (field === 'misc.dateShort') return 'date';
  if (field.endsWith('Long')) {
    const shortKey = field.slice(0, -4);
    if (FIELD_TYPES[shortKey] === 'date' || FIELD_TYPES[field] === 'date') return null;
  }
  const fieldType = FIELD_TYPES[field];
  if (!fieldType) return null;
  switch (fieldType) {
    case 'number':
    case 'currency':
    case 'percent':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return 'select';
    default:
      return 'text';
  }
}

export function parseTemplateCondition(raw: unknown): TemplateCondition {
  if (!Array.isArray(raw)) return [];
  const rules: TemplateConditionRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.field !== 'string' || record.field.length === 0) continue;
    const type = isFilterType(record.type) ? record.type : (conditionFilterType(record.field) ?? 'text');
    const id = typeof record.id === 'string' && record.id.length > 0 ? record.id : crypto.randomUUID();
    rules.push({ id, field: record.field, type, value: record.value });
  }
  return rules;
}

export function isActiveTemplateCondition(raw: unknown): boolean {
  return parseTemplateCondition(raw).length > 0;
}

export function readTemplateRaw(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data) return {};
  const raw = TEMPLATE_RAW_KEY in data ? data[TEMPLATE_RAW_KEY] : undefined;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function withTemplateRaw<T extends Record<string, unknown>>(display: T, raw: Record<string, unknown>): T {
  return { ...display, [TEMPLATE_RAW_KEY]: raw };
}

function lookupPath(scope: Record<string, unknown>, path: string): { found: boolean; value: unknown } {
  const parts = path.split('.').filter((part) => part.length > 0);
  if (parts.length === 0) return { found: false, value: undefined };
  let current: unknown = scope;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return { found: false, value: undefined };
    const record = current as Record<string, unknown>;
    if (!(part in record)) return { found: false, value: undefined };
    current = record[part];
  }
  return { found: true, value: current };
}

/** Every rule must match. An empty condition is always true. A missing field fails that rule. */
export function matchesTemplateCondition(
  condition: unknown,
  rawScope: Record<string, unknown> | null | undefined,
  options?: FilterMatchOptions,
): boolean {
  const rules = parseTemplateCondition(condition);
  if (rules.length === 0) return true;
  const scope = rawScope ?? {};
  for (const rule of rules) {
    const lookedUp = lookupPath(scope, rule.field);
    if (!lookedUp.found) return false;
    if (!matchesFilterByType(lookedUp.value, rule.value, rule.type, options)) return false;
  }
  return true;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(payload: string): Uint8Array {
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeConditionPayload(condition: unknown): string {
  const json = JSON.stringify(parseTemplateCondition(condition));
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeConditionPayload(payload: string): TemplateCondition {
  if (!payload) return [];
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payload));
    return parseTemplateCondition(JSON.parse(json));
  } catch {
    return [];
  }
}

export function wrapWithTemplateCondition(html: string, showIf: unknown): string {
  const rules = parseTemplateCondition(showIf);
  if (rules.length === 0) return html;
  return `{{#if:${encodeConditionPayload(rules)}}}${html}${END_MARK}`;
}

/** Turn TipTap condition pills into markers `processTemplate` evaluates. */
export function replaceConditionPills(html: string): string {
  return html.replace(
    /<span\b[^>]*\bdata-template-condition="(if|else|end)"[^>]*>[\s\S]*?<\/span>/gi,
    (span, role: string) => {
      if (role === 'else') return ELSE_MARK;
      if (role === 'end') return END_MARK;
      const payload = /data-condition="([^"]*)"/.exec(span)?.[1] ?? '';
      return `{{#if:${payload}}}`;
    },
  );
}

type IfClose = {
  /** Index of the matching `{{else}}`, when this if has one. */
  elseAt: number | null;
  endAt: number;
  closeEnd: number;
};

function findIfClose(template: string, from: number): IfClose | null {
  let depth = 1;
  let elseAt: number | null = null;
  let searchPos = from;

  while (searchPos < template.length) {
    const nextIf = template.indexOf('{{#if:', searchPos);
    const nextElse = template.indexOf(ELSE_MARK, searchPos);
    const nextEnd = template.indexOf(END_MARK, searchPos);
    const candidates = [nextIf, nextElse, nextEnd].filter((index) => index !== -1);
    if (candidates.length === 0) return null;
    const next = Math.min(...candidates);

    if (next === nextIf) {
      const close = template.indexOf('}}', nextIf + 6);
      if (close === -1) return null;
      depth++;
      searchPos = close + 2;
      continue;
    }
    if (next === nextElse) {
      if (depth === 1 && elseAt === null) elseAt = nextElse;
      searchPos = nextElse + ELSE_MARK.length;
      continue;
    }
    depth--;
    if (depth === 0) {
      return { elseAt, endAt: nextEnd, closeEnd: nextEnd + END_MARK.length };
    }
    searchPos = nextEnd + END_MARK.length;
  }
  return null;
}

/**
 * Keep the then-branch when `{{#if}}`…`{{/if}}` matches, otherwise the else-branch.
 * An unclosed marker is left in place so content is not deleted.
 */
export function evaluateTemplateConditions(
  template: string,
  rawScope: Record<string, unknown>,
  options?: FilterMatchOptions,
): string {
  let result = '';
  let last = 0;
  const opener = new RegExp(IF_OPEN.source, 'g');
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: scan loop
  while ((match = opener.exec(template)) !== null) {
    const start = match.index;
    result += template.slice(last, start);
    const openEnd = start + match[0].length;
    const found = findIfClose(template, openEnd);
    if (!found) {
      result += template.slice(start);
      return result;
    }
    const condition = decodeConditionPayload(match[1] ?? '');
    const thenBranch = template.slice(openEnd, found.elseAt ?? found.endAt);
    const elseBranch = found.elseAt == null ? '' : template.slice(found.elseAt + ELSE_MARK.length, found.endAt);
    const chosen = matchesTemplateCondition(condition, rawScope, options) ? thenBranch : elseBranch;
    result += evaluateTemplateConditions(chosen, rawScope, options);
    last = found.closeEnd;
    opener.lastIndex = last;
  }

  result += template.slice(last);
  return result;
}
