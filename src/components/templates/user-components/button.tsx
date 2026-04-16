'use client';

import { useNode } from '@craftjs/core';
import type { TemplateDataset } from '@prisma/client';
import { Link2, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { MergeTagField, MergeTagLoop } from '@/actions/templates/queries/get-merge-tags';
import { useEditorMetadata } from '@/components/templates/editor-context';
import { useMergeTagConfig } from '../merge-tag-context';
import { MergeTagDropdown } from '../merge-tag-dropdown';

interface ButtonProps {
  text: string;
  url: string;
  background?: string;
  color?: string;
  useSystemUrl?: boolean;
  systemUrlKey?: string;
}

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

/** Context-specific system links: hide in button dropdown where dataset cannot supply sensible merge context. */
function isSystemUrlKeyVisibleForDataset(key: SystemUrlKey, dataset: TemplateDataset): boolean {
  switch (key) {
    case 'loanLink':
      return dataset === 'LOAN' || dataset === 'TRANSACTION';
    case 'projectLink':
      return dataset !== 'USER';
    case 'lenderLink':
      return true;
    default:
      return true;
  }
}

export const Button = ({
  text = 'Klick mich',
  url = '#',
  background = '#2563eb',
  color = '#ffffff',
  useSystemUrl = false,
  systemUrlKey = '',
}: ButtonProps) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const displayUrl = useSystemUrl && systemUrlKey ? `{{system.${systemUrlKey}}}` : url;

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(drag(dom));
        }
      }}
      className={`inline-block my-2 ${selected ? 'outline-1 outline-blue-500' : ''}`}
    >
      <a
        href={displayUrl}
        style={{
          backgroundColor: background,
          color,
          padding: '10px 20px',
          borderRadius: '4px',
          textDecoration: 'none',
          display: 'inline-block',
          fontWeight: 'bold',
        }}
        onClick={(e) => e.preventDefault()}
      >
        {text}
      </a>
    </div>
  );
};

export const ButtonSettings = () => {
  const t = useTranslations('templates.editor.components.button');
  const editorMeta = useEditorMetadata();
  const config = useMergeTagConfig();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    actions: { setProp },
    text,
    url,
    background,
    color,
    useSystemUrl,
    systemUrlKey,
  } = useNode((node) => ({
    text: node.data.props.text,
    url: node.data.props.url,
    background: node.data.props.background,
    color: node.data.props.color,
    useSystemUrl: node.data.props.useSystemUrl ?? false,
    systemUrlKey: node.data.props.systemUrlKey ?? '',
  }));

  const visibleSystemUrlKeys = useMemo(
    () => SYSTEM_URL_KEYS.filter((key) => isSystemUrlKeyVisibleForDataset(key, editorMeta.dataset)),
    [editorMeta.dataset],
  );

  useEffect(() => {
    if (!systemUrlKey) return;
    if (!isSystemUrlKeyVisibleForDataset(systemUrlKey as SystemUrlKey, editorMeta.dataset)) {
      setProp((props: ButtonProps) => {
        props.systemUrlKey = '';
      });
    }
  }, [editorMeta.dataset, systemUrlKey, setProp]);

  const handleMergeTagSelect = (item: MergeTagField | MergeTagLoop) => {
    const tagValue = 'startTag' in item ? item.startTag : item.value;
    setProp((props: ButtonProps) => {
      props.text = props.text ? `${props.text} ${tagValue}` : tagValue;
    });
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
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.text = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              setDropdownPos({ top: rect.bottom + 5, left: rect.left - 100 });
              setDropdownOpen(true);
            }
          }}
          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
        >
          <PlusCircle className="w-3 h-3" />
          {t('insertPlaceholder')}
        </button>
      </div>

      {/* URL section */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={useSystemUrl}
            onChange={(e) =>
              setProp((props: ButtonProps) => {
                props.useSystemUrl = e.target.checked;
                if (!e.target.checked) {
                  props.systemUrlKey = '';
                }
              })
            }
            className="rounded border-zinc-300"
          />
          <Link2 className="w-3 h-3 text-zinc-500" />
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
              onChange={(e) =>
                setProp((props: ButtonProps) => {
                  props.systemUrlKey = e.target.value;
                })
              }
              className="w-full px-2 py-1 border rounded text-sm"
            >
              <option value="">{t('systemUrlKeyPlaceholder')}</option>
              {visibleSystemUrlKeys.map((key) => (
                <option key={key} value={key}>
                  {t(`systemUrlKeys.${key}`)}
                </option>
              ))}
            </select>
            {systemUrlKey && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {'{{'}system.{systemUrlKey}{'}}'}
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
              onChange={(e) =>
                setProp((props: ButtonProps) => {
                  props.url = e.target.value;
                })
              }
              className="w-full px-2 py-1 border rounded text-sm font-mono"
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
          value={background}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.background = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="color">
          {t('textColor')}
        </label>
        <input
          id="color"
          type="color"
          value={color}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.color = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>

      {config && (
        <MergeTagDropdown
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          onSelect={handleMergeTagSelect}
          config={config}
          position={dropdownPos}
        />
      )}
    </div>
  );
};

Button.craft = {
  props: {
    text: 'Klick mich',
    url: '#',
    background: '#2563eb',
    color: '#ffffff',
    useSystemUrl: false,
    systemUrlKey: '',
  },
  related: {
    settings: ButtonSettings,
  },
};
