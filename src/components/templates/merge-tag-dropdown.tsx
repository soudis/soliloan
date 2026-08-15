'use client';

import type { TemplateDataset } from '@prisma/client';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MergeTagConfig, MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  canInsertLoopAtContext,
  loopChildFieldsGroupKey,
  resolveMergeTagGroupKey,
  shouldShowLoopChildFieldsGroup,
} from '@/lib/templates/merge-tag-insertion-filter';
import { cn } from '@/lib/utils';

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
          key: loopChildFieldsGroupKey(loop.key),
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
  /** After a manual group change while open, do not re-apply loop-context preference. */
  const userPickedGroupRef = useRef(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      userPickedGroupRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      userPickedGroupRef.current = false;
    }

    const availableGroupKeys = groups.map((group) => group.key);
    const preferInnermostLoopFields = justOpened || !userPickedGroupRef.current;

    setSelectedGroupKey((currentGroupKey) =>
      resolveMergeTagGroupKey({
        availableGroupKeys,
        ancestorLoopsInnermostFirst: insertionContext?.ancestorLoopsInnermostFirst,
        currentGroupKey,
        preferInnermostLoopFields,
      }),
    );
  }, [groups, isOpen, insertionContext?.ancestorLoopsInnermostFirst]);

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
            <Select
              value={selectedGroupKey || undefined}
              onValueChange={(nextGroupKey) => {
                userPickedGroupRef.current = true;
                setSelectedGroupKey(nextGroupKey);
              }}
            >
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
            <MergeTagFieldSelect
              items={selectedGroup?.items ?? []}
              value={selectedItemKey}
              onValueChange={setSelectedItemKey}
              disabled={!selectedGroup || selectedGroup.items.length === 0}
              placeholder={tMergeTags('fieldPlaceholder')}
              loopSuffix={tMergeTags('loopSuffix')}
            />
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

function MergeTagFieldSelect({
  items,
  value,
  onValueChange,
  disabled,
  placeholder,
  loopSuffix,
}: {
  items: MergeTagItem[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  loopSuffix: string;
}) {
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const options = useMemo(
    () =>
      items.map((item) => ({
        value: item.key,
        label: isLoop(item) ? `${item.label} (${loopSuffix})` : item.label,
      })),
    [items, loopSuffix],
  );

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const currentOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">{currentOption ? currentOption.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100002] w-[--radix-popover-trigger-width] p-0"
        align="start"
        data-merge-tag-dropdown-sub=""
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={tCommon('ui.actions.search')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            disabled={disabled}
          />
        </div>
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{tCommon('ui.actions.noResults')}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === option.value && 'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                  setSearchQuery('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
