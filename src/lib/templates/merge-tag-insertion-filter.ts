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

export function shouldShowLoopChildFieldsGroup(loop: MergeTagLoop, ancestorLoopsInnermostFirst: unknown): boolean {
  const stack = Array.isArray(ancestorLoopsInnermostFirst) ? ancestorLoopsInnermostFirst : [];
  const innermost = stack[0] ?? null;
  return innermost !== null && loop.key === innermost && loop.childFields.length > 0;
}
