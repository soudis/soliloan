'use client';

import { Link2, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { useEditorMetadata } from '../../editor-context';
import { useMergeTagConfig } from '../../merge-tag-context';
import { MergeTagDropdown } from '../../merge-tag-dropdown';
import { usePatchSelectedProps, usePuckAncestorLoops, useSelectedRecord } from '../use-puck-selected';

const SYSTEM_URL_KEYS = [
  'passwordReset',
  'emailVerification',
  'invitation',
  'login',
  'projectLink',
  'lenderLink',
  'loanLink',
] as const;

type SystemUrlKey = (typeof SYSTEM_URL_KEYS)[number];

function isSystemUrlKeyVisibleForDataset(key: SystemUrlKey, dataset: string): boolean {
  switch (key) {
    case 'loanLink':
      return dataset === 'LOAN' || dataset === 'TRANSACTION';
    case 'projectLink':
      return dataset !== 'USER';
    default:
      return true;
  }
}

export function ButtonSettingsField() {
  const t = useTranslations('templates.editor.components.button');
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const patch = usePatchSelectedProps();
  const ancestorLoops = usePuckAncestorLoops(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const props = useSelectedRecord();
  const text = String(props.text ?? '');
  const url = String(props.url ?? '');
  const useSystemUrl = Boolean(props.useSystemUrl);
  const systemUrlKey = String(props.systemUrlKey ?? '');

  const visibleSystemUrlKeys = useMemo(
    () => SYSTEM_URL_KEYS.filter((key) => isSystemUrlKeyVisibleForDataset(key, editorMeta.dataset)),
    [editorMeta.dataset],
  );

  useEffect(() => {
    if (!systemUrlKey) return;
    if (!isSystemUrlKeyVisibleForDataset(systemUrlKey as SystemUrlKey, editorMeta.dataset)) {
      patch({ systemUrlKey: '' });
    }
  }, [editorMeta.dataset, patch, systemUrlKey]);

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const tagValue = 'startTag' in item ? item.startTag : item.value;
    patch({ text: text ? `${text} ${tagValue}` : tagValue });
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-4 px-4 py-3">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="puckButtonText">
          {t('buttonText')}
        </label>
        <input
          id="puckButtonText"
          type="text"
          value={text}
          onChange={(event) => patch({ text: event.target.value })}
          className="w-full rounded border px-2 py-1 text-sm"
        />
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
              setDropdownOpen(true);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
        >
          <PlusCircle className="h-3 w-3" />
          {t('insertPlaceholder')}
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={useSystemUrl}
            onChange={(event) =>
              patch({
                useSystemUrl: event.target.checked,
                ...(event.target.checked ? {} : { systemUrlKey: '' }),
              })
            }
            className="rounded border-border"
          />
          <Link2 className="h-3 w-3 text-muted-foreground" />
          {t('useSystemUrl')}
        </label>

        {useSystemUrl ? (
          <div className="space-y-1">
            <label htmlFor="puckSystemUrlKey" className="text-xs font-medium">
              {t('systemUrlKey')}
            </label>
            <select
              id="puckSystemUrlKey"
              value={systemUrlKey}
              onChange={(event) => patch({ systemUrlKey: event.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            >
              <option value="">{t('systemUrlKeyPlaceholder')}</option>
              {visibleSystemUrlKeys.map((key) => (
                <option key={key} value={key}>
                  {t(`systemUrlKeys.${key}`)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1">
            <label htmlFor="puckButtonUrl" className="text-xs font-medium">
              {t('url')}
            </label>
            <input
              id="puckButtonUrl"
              type="text"
              value={url}
              onChange={(event) => patch({ url: event.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>

      {config && (
        <MergeTagDropdown
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          onSelect={handleMergeTagSelect}
          config={config}
          position={dropdownPos}
          insertionContext={{ ancestorLoopsInnermostFirst: ancestorLoops, dataset: editorMeta.dataset }}
        />
      )}
    </div>
  );
}
