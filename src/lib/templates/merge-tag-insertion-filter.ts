import type { TemplateDataset } from '@prisma/client';
import type { MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { DATASET_CONFIGS, LOOP_DEFINITIONS } from '@/lib/templates/merge-tags';

export type MergeTagInsertionContext = {
  /** Loop keys from innermost enclosing Container/Table to outermost (`parent` chain). */
  ancestorLoopsInnermostFirst: string[];
  dataset: TemplateDataset;
};

function loopDefinitionForKey(loopKey: string) {
  return LOOP_DEFINITIONS[loopKey];
}

/**
 * Parent loop required to *open* this loop in the template, adjusted per dataset.
 * When a loop is listed at the dataset root in `DATASET_CONFIGS`, we do not require a parent
 * in the editor (e.g. `transactions` on LOAN is root-level in merge data).
 */
export function getEffectiveLoopParentRequired(loopKey: string, dataset: TemplateDataset): string | undefined {
  const cfg = DATASET_CONFIGS[dataset];
  if (cfg.loops.includes(loopKey)) {
    return undefined;
  }
  return loopDefinitionForKey(loopKey)?.parentRequired;
}

export function canInsertLoopAtContext(
  loop: MergeTagLoop,
  ancestorLoopsInnermostFirst: string[] | readonly string[],
  dataset: TemplateDataset,
): boolean {
  const stack = Array.isArray(ancestorLoopsInnermostFirst) ? ancestorLoopsInnermostFirst : [];
  const innermost = stack[0] ?? null;

  if (innermost === loop.key) {
    return false;
  }

  if (stack.includes(loop.key)) {
    return false;
  }

  const parentReq = getEffectiveLoopParentRequired(loop.key, dataset);
  if (!parentReq) {
    return true;
  }

  const outerToInner = [...stack].reverse();
  return outerToInner.includes(parentReq);
}

/** Loops the user may assign to a Container/Table given canvas nesting (ancestors only, excluding the node being configured). */
export function mergeLoopsAllowedForCanvasPlacement(
  loops: readonly MergeTagLoop[],
  ancestorLoopsInnermostFirst: string[] | readonly string[],
  dataset: TemplateDataset,
): MergeTagLoop[] {
  return loops.filter((loop) => canInsertLoopAtContext(loop, ancestorLoopsInnermostFirst, dataset));
}

export function shouldShowLoopChildFieldsGroup(loop: MergeTagLoop, ancestorLoopsInnermostFirst: unknown): boolean {
  const stack = Array.isArray(ancestorLoopsInnermostFirst) ? ancestorLoopsInnermostFirst : [];
  const innermost = stack[0] ?? null;
  return innermost !== null && loop.key === innermost && loop.childFields.length > 0;
}

/** Dropdown group key for a loop's per-iteration child fields (`loop-fields:transactionsYearly`, …). */
export function loopChildFieldsGroupKey(loopKey: string): string {
  return `loop-fields:${loopKey}`;
}

/**
 * Decides which merge-tag group the dropdown should show.
 *
 * Priority when `preferInnermostLoopFields` is true (fresh open):
 * 1. Child-fields group for the innermost enclosing loop, if that group exists
 * 2. Current selection, if still in the available list
 * 3. First available group
 *
 * When `preferInnermostLoopFields` is false (already open; user may have changed group):
 * skip step 1 so a manual choice is not overridden when the groups list refreshes.
 */
export function resolveMergeTagGroupKey(options: {
  availableGroupKeys: readonly string[];
  ancestorLoopsInnermostFirst?: readonly string[];
  currentGroupKey?: string;
  preferInnermostLoopFields?: boolean;
}): string {
  const {
    availableGroupKeys,
    ancestorLoopsInnermostFirst = [],
    currentGroupKey = '',
    preferInnermostLoopFields = true,
  } = options;

  if (availableGroupKeys.length === 0) return '';

  if (preferInnermostLoopFields) {
    const innermost = ancestorLoopsInnermostFirst[0];
    if (innermost) {
      const loopGroupKey = loopChildFieldsGroupKey(innermost);
      if (availableGroupKeys.includes(loopGroupKey)) {
        return loopGroupKey;
      }
    }
  }

  if (currentGroupKey && availableGroupKeys.includes(currentGroupKey)) {
    return currentGroupKey;
  }

  return availableGroupKeys[0] ?? '';
}
