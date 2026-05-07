'use client';

import type { TemplateDataset } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MergeTagConfig, MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { canInsertLoopAtContext, shouldShowLoopChildFieldsGroup } from '@/lib/templates/merge-tag-insertion-filter';

type MergeTagItem = MergeTagField | MergeTagLoop;
type MergeTagGroup = {
  key: string;
  label: string;
  /** Hint shown under the title in the group select (translations). */
  description: string;
  items: MergeTagItem[];
};

const isLoop = (item: MergeTagItem): item is MergeTagLoop => 'startTag' in item;

export type MergeTagDropdownInsertionContext = {
  ancestorLoopsInnermostFirst: string[];
  dataset: TemplateDataset;
};

export function MergeTagDropdown({
  isOpen,
  onClose,
  onSelect,
  config,
  position,
  insertionContext,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MergeTagItem) => void;
  config: MergeTagConfig;
  position: { top: number; left: number };
  /** When set (editor blocks), restricts loop wrappers and loop-only fields to the current enclosing loops. */
  insertionContext?: MergeTagDropdownInsertionContext;
}) {
  const tFields = useTranslations('fields');
  const tMergeTags = useTranslations('templates.editor.mergeTags');

  const groups = useMemo<MergeTagGroup[]>(() => {
    const loopsShownInToolbar = insertionContext
      ? config.loops.filter((loop) =>
          canInsertLoopAtContext(loop, insertionContext.ancestorLoopsInnermostFirst, insertionContext.dataset),
        )
      : config.loops;

    const entityOrder: string[] = [];
    const entityMap = new Map<string, MergeTagField[]>();

    for (const field of config.topLevelFields) {
      if (!entityMap.has(field.entity)) {
        entityOrder.push(field.entity);
        entityMap.set(field.entity, []);
      }

      entityMap.get(field.entity)?.push(field);
    }

    const nextGroups: MergeTagGroup[] = entityOrder
      .map((entity) => ({
        key: `entity:${entity}`,
        label: tFields(`categories.${entity}`),
        description: tMergeTags(`groupDescriptions.entity.${entity}` as Parameters<typeof tMergeTags>[0]),
        items: entityMap.get(entity) ?? [],
      }))
      .filter((group) => group.items.length > 0);

    if (config.additionalFields.lender.length > 0) {
      nextGroups.push({
        key: 'additional:lender',
        label: `${tFields('categories.lender')} ${tMergeTags('additionalFieldsSuffix')}`,
        description: tMergeTags('groupDescriptions.additionalLender'),
        items: config.additionalFields.lender,
      });
    }

    if (config.additionalFields.loan.length > 0) {
      nextGroups.push({
        key: 'additional:loan',
        label: `${tFields('categories.loan')} ${tMergeTags('additionalFieldsSuffix')}`,
        description: tMergeTags('groupDescriptions.additionalLoan'),
        items: config.additionalFields.loan,
      });
    }

    if (loopsShownInToolbar.length > 0) {
      nextGroups.push({
        key: 'loops',
        label: tFields('categories.loops'),
        description: tMergeTags('groupDescriptions.loops'),
        items: loopsShownInToolbar,
      });
    }

    const loopsWithChildUi = insertionContext
      ? config.loops.filter((loop) =>
          shouldShowLoopChildFieldsGroup(loop, insertionContext.ancestorLoopsInnermostFirst),
        )
      : config.loops;

    for (const loop of loopsWithChildUi) {
      if (loop.childFields.length > 0) {
        nextGroups.push({
          key: `loop-fields:${loop.key}`,
          label: `${loop.label} ${tMergeTags('childFieldsSuffix')}`,
          description: tMergeTags(`groupDescriptions.loopChild.${loop.key}` as Parameters<typeof tMergeTags>[0]),
          items: loop.childFields,
        });
      }
    }

    return nextGroups;
  }, [config, insertionContext, tFields, tMergeTags]);

  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [selectedItemKey, setSelectedItemKey] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setSelectedGroupKey((currentGroupKey) => {
      if (groups.length === 0) return '';
      return groups.some((group) => group.key === currentGroupKey) ? currentGroupKey : groups[0].key;
    });
  }, [groups, isOpen]);

  const selectedGroup = groups.find((group) => group.key === selectedGroupKey);

  useEffect(() => {
    if (!selectedGroup) {
      setSelectedItemKey('');
      return;
    }

    setSelectedItemKey((currentItemKey) => {
      return selectedGroup.items.some((item) => item.key === currentItemKey)
        ? currentItemKey
        : (selectedGroup.items[0]?.key ?? '');
    });
  }, [selectedGroup]);

  const selectedItem = selectedGroup?.items.find((item) => item.key === selectedItemKey);

  /** Root: backdrop + panel (Select portals outside this subtree — see `data-merge-tag-dropdown-sub`). */
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownCapture = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (rootRef.current?.contains(target)) return;
      if (target.closest('[data-merge-tag-dropdown-sub]')) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDownCapture, true);
    return () => document.removeEventListener('pointerdown', handlePointerDownCapture, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal to document.body so `position: fixed` uses viewport coordinates from
  // getBoundingClientRect(). Ancestors with `transform` (e.g. Radix Dialog) would
  // otherwise make fixed positioning relative to that ancestor and misplace the panel.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[100000]" data-merge-tag-dropdown-root="">
      <button
        type="button"
        className="pointer-events-auto fixed inset-0 z-0 cursor-default bg-transparent"
        aria-label="Close"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="pointer-events-auto fixed z-[1] w-80 max-h-[min(24rem,calc(100vh-2rem))] overflow-y-auto rounded-lg border bg-background p-4 shadow-xl"
        style={{ top: position.top, left: position.left }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{tMergeTags('groupLabel')}</p>
            <Select value={selectedGroupKey || undefined} onValueChange={setSelectedGroupKey}>
              <SelectTrigger className="h-auto min-h-10 w-full whitespace-normal px-3 py-2 text-left [&>svg]:shrink-0">
                <SelectValue placeholder={tMergeTags('groupPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="z-[100002]" position="popper" data-merge-tag-dropdown-sub="">
                {groups.map((group) => (
                  <SelectItem
                    key={group.key}
                    value={group.key}
                    textValue={`${group.label} ${group.description}`}
                    className="!items-start py-2.5"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium leading-tight">{group.label}</span>
                      <span className="text-xs leading-snug text-muted-foreground">{group.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{tMergeTags('fieldLabel')}</p>
            <Select
              value={selectedItemKey || undefined}
              onValueChange={setSelectedItemKey}
              disabled={!selectedGroup || selectedGroup.items.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tMergeTags('fieldPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="z-[100002]" position="popper" data-merge-tag-dropdown-sub="">
                {selectedGroup?.items.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                    {isLoop(item) ? ` (${tMergeTags('loopSuffix')})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!selectedItem}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => {
              if (!selectedItem) return;
              onSelect(selectedItem);
              onClose();
            }}
          >
            {tMergeTags('insert')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
