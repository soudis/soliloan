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

  const lenderFields = config.topLevelFields.filter((f) => f.entity === 'lender');
  const loanFields = config.topLevelFields.filter((f) => f.entity === 'loan');
  const configFields = config.topLevelFields.filter((f) => f.entity === 'config');
  const pageFields = config.topLevelFields.filter((f) => f.entity === 'page');

  const groups: { label: string; items: (MergeTagField | MergeTagLoop)[]; color: string; isLoop?: boolean }[] = [];

  if (pageFields.length > 0) {
    groups.push({ label: t('categories.page'), items: pageFields, color: '#e0f2f1' });
  }
  if (configFields.length > 0) {
    groups.push({ label: t('categories.config'), items: configFields, color: '#f3e5f5' });
  }
  if (lenderFields.length > 0) {
    groups.push({ label: t('categories.lender'), items: lenderFields, color: '#e3f2fd' });
  }
  if (loanFields.length > 0) {
    groups.push({ label: t('categories.loan'), items: loanFields, color: '#fff3e0' });
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
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: needed */}
      <div className="fixed inset-0 z-[9998]" onMouseDown={(e) => e.preventDefault()} onClick={onClose} />
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
