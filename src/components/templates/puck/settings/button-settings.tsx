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

export function ButtonSettings() {
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
  const background = String(props.background ?? '#2563eb');
  const color = String(props.color ?? '#ffffff');

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
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="buttonText">
          {t('buttonText')}
        </label>
        <input
          id="buttonText"
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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
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
            <label htmlFor="systemUrlKey" className="text-xs font-medium">
              {t('systemUrlKey')}
            </label>
            <select
              id="systemUrlKey"
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
            {systemUrlKey && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {'{{'}system.{systemUrlKey}
                {'}}'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="url">
              {t('url')}
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(event) => patch({ url: event.target.value })}
              className="w-full rounded border px-2 py-1 font-mono text-sm"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="background">
          {t('backgroundColor')}
        </label>
        <input
          id="background"
          type="color"
          value={background.startsWith('#') ? background : '#2563eb'}
          onChange={(event) => patch({ background: event.target.value })}
          className="h-8 w-full rounded border p-0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="color">
          {t('textColor')}
        </label>
        <input
          id="color"
          type="color"
          value={color.startsWith('#') ? color : '#ffffff'}
          onChange={(event) => patch({ color: event.target.value })}
          className="h-8 w-full rounded border p-0"
        />
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
