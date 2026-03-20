'use client';

import { useTranslations } from 'next-intl';
import type { MergeTagConfig, MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';

export function MergeTagDropdown({
  isOpen,
  onClose,
  onSelect,
  config,
  position,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MergeTagField | MergeTagLoop) => void;
  config: MergeTagConfig;
  position: { top: number; left: number };
}) {
  const t = useTranslations('fields');

  if (!isOpen || !config) return null;

  const ENTITY_COLORS: Record<string, string> = {
    page: '#e0f2f1',
    platform: '#fce4ec',
    config: '#f3e5f5',
    lender: '#e3f2fd',
    loan: '#fff3e0',
    latestTransaction: '#fff8e1',
    user: '#ede7f6',
    lenderYearly: '#e8eaf6',
    project: '#e0f7fa',
  };
  const DEFAULT_COLOR = '#f5f5f5';

  // Group top-level fields by entity, preserving order of first appearance
  const entityOrder: string[] = [];
  const entityMap = new Map<string, MergeTagField[]>();
  for (const field of config.topLevelFields) {
    if (!entityMap.has(field.entity)) {
      entityOrder.push(field.entity);
      entityMap.set(field.entity, []);
    }
    entityMap.get(field.entity)?.push(field);
  }

  const groups: { label: string; items: (MergeTagField | MergeTagLoop)[]; color: string; isLoop?: boolean }[] = [];

  for (const entity of entityOrder) {
    const fields = entityMap.get(entity) ?? [];
    if (fields.length > 0) {
      groups.push({
        label: t(`categories.${entity}`),
        items: fields,
        color: ENTITY_COLORS[entity] ?? DEFAULT_COLOR,
      });
    }
  }

  if (config.loops.length > 0) {
    groups.push({
      label: t('categories.loops'),
      items: config.loops,
      color: '#bbdefb',
      isLoop: true,
    });
  }

  for (const loop of config.loops) {
    if (loop.childFields.length > 0) {
      groups.push({
        label: `${loop.label} Felder`,
        items: loop.childFields,
        color: '#e8f5e9',
      });
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9998]"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="fixed z-[9999] bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl max-h-80 overflow-y-auto min-w-64"
        style={{ top: position.top, left: position.left }}
      >
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-2 text-xs font-bold text-zinc-400 bg-zinc-900 sticky top-0">{group.label}</div>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.key}
                onMouseDown={(e) => {
                  // Prevent button from taking focus
                  e.preventDefault();
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <span>
                  {item.label}
                  {group.isLoop && <span className="ml-2 text-[10px] text-zinc-500 font-mono">(Schleife)</span>}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
