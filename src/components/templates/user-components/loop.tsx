'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface LoopProps {
  loopKey: string;
  label?: string;
  children?: ReactNode;
}

export const Loop = ({ loopKey, label = 'Datenschleife', children }: LoopProps) => {
  const {
    connectors: { connect },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(dom);
        }
      }}
      className={`my-4 border-2 border-dashed rounded-md overflow-hidden ${
        selected ? 'border-blue-500' : 'border-zinc-300'
      }`}
    >
      <div className="bg-zinc-100 px-3 py-1 text-[10px] font-mono text-zinc-500 flex justify-between items-center border-b border-zinc-200">
        <span>
          {'{{#'}
          {loopKey}
          {'}}'}
        </span>
        <span className="font-sans font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="p-4 min-h-[50px] bg-zinc-50/50">{children}</div>
      <div className="bg-zinc-100 px-3 py-1 text-[10px] font-mono text-zinc-500 border-t border-zinc-200 text-right">
        <span>
          {'{{/'}
          {loopKey}
          {'}}'}
        </span>
      </div>
    </div>
  );
};

export const LoopSettings = () => {
  const t = useTranslations('templates.editor.components.loop');
  const {
    actions: { setProp },
    loopKey,
    label,
  } = useNode((node) => ({
    loopKey: node.data.props.loopKey,
    label: node.data.props.label,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="loopKey">
          {t('loopKey')}
        </label>
        <input
          id="loopKey"
          type="text"
          value={loopKey}
          onChange={(e) =>
            setProp((props: LoopProps) => {
              props.loopKey = e.target.value;
            })
          }
          placeholder={t('placeholder')}
          className="w-full px-2 py-1 border rounded text-sm font-mono"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="label">
          {t('displayName')}
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) =>
            setProp((props: LoopProps) => {
              props.label = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
    </div>
  );
};

Loop.craft = {
  isCanvas: true,
  props: {
    loopKey: 'key',
    label: 'Datenschleife',
  },
  related: {
    settings: LoopSettings,
  },
};
