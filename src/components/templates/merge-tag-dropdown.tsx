'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MergeTagConfig, MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MergeTagItem = MergeTagField | MergeTagLoop;
type MergeTagGroup = {
  key: string;
  label: string;
  items: MergeTagItem[];
};

const isLoop = (item: MergeTagItem): item is MergeTagLoop => 'startTag' in item;

export function MergeTagDropdown({
  isOpen,
  onClose,
  onSelect,
  config,
  position,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MergeTagItem) => void;
  config: MergeTagConfig;
  position: { top: number; left: number };
}) {
  const tFields = useTranslations('fields');
  const tMergeTags = useTranslations('templates.editor.mergeTags');

  const groups = useMemo<MergeTagGroup[]>(() => {
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
        items: entityMap.get(entity) ?? [],
      }))
      .filter((group) => group.items.length > 0);

    if (config.additionalFields.lender.length > 0) {
      nextGroups.push({
        key: 'additional:lender',
        label: `${tFields('categories.lender')} ${tMergeTags('additionalFieldsSuffix')}`,
        items: config.additionalFields.lender,
      });
    }

    if (config.additionalFields.loan.length > 0) {
      nextGroups.push({
        key: 'additional:loan',
        label: `${tFields('categories.loan')} ${tMergeTags('additionalFieldsSuffix')}`,
        items: config.additionalFields.loan,
      });
    }

    if (config.loops.length > 0) {
      nextGroups.push({
        key: 'loops',
        label: tFields('categories.loops'),
        items: config.loops,
      });
    }

    for (const loop of config.loops) {
      if (loop.childFields.length > 0) {
        nextGroups.push({
          key: `loop-fields:${loop.key}`,
          label: `${loop.label} ${tMergeTags('childFieldsSuffix')}`,
          items: loop.childFields,
        });
      }
    }

    return nextGroups;
  }, [config, tFields, tMergeTags]);

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

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9998]"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="fixed z-[9999] w-80 rounded-lg border bg-background p-4 shadow-xl"
        style={{ top: position.top, left: position.left }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{tMergeTags('groupLabel')}</p>
            <Select value={selectedGroupKey || undefined} onValueChange={setSelectedGroupKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tMergeTags('groupPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {groups.map((group) => (
                  <SelectItem key={group.key} value={group.key}>
                    {group.label}
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
              <SelectContent className="z-[10000]">
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
    </>
  );
}
