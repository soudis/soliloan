'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  padding?: number;
  background?: string;
  children?: ReactNode;
}

export const PageHeader = ({
  padding = 16,
  background = 'transparent',
  children,
}: PageHeaderProps) => {
  const t = useTranslations('templates.editor.components.pageHeader');
  const {
    connectors: { connect },
  } = useNode();

  const isEmpty = !children || (Array.isArray(children) && children.length === 0);

  return (
    <div
      ref={(dom) => {
        if (dom) connect(dom);
      }}
      className="w-full"
    >
      <div
        style={{
          padding: `${padding}px`,
          background,
        }}
        className="min-h-[40px]"
      >
        {children}
        {isEmpty && (
          <div className="py-4 border-2 border-dashed border-zinc-200 rounded flex items-center justify-center text-zinc-400 text-xs pointer-events-none w-full">
            {t('dropHere')}
          </div>
        )}
      </div>
      {/* Visual separator */}
      <div className="border-b border-dashed border-zinc-300 mx-4 relative">
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white text-[10px] text-zinc-400 px-2 pointer-events-none z-[2]">
          {t('label')}
        </span>
      </div>
    </div>
  );
};

export const PageHeaderSettings = () => {
  const t = useTranslations('templates.editor.components.pageHeader');
  const {
    actions: { setProp },
    padding,
    background,
  } = useNode((node) => ({
    padding: node.data.props.padding,
    background: node.data.props.background,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label htmlFor="headerPadding" className="text-xs font-medium">
          {t('padding')}
        </label>
        <input
          id="headerPadding"
          type="number"
          value={padding}
          onChange={(e) =>
            setProp((props: PageHeaderProps) => {
              props.padding = Number(e.target.value);
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="headerBg" className="text-xs font-medium">
          {t('backgroundColor')}
        </label>
        <input
          id="headerBg"
          type="color"
          value={background === 'transparent' ? '#ffffff' : background}
          onChange={(e) =>
            setProp((props: PageHeaderProps) => {
              props.background = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>
    </div>
  );
};

PageHeader.craft = {
  isCanvas: true,
  props: {
    padding: 16,
    background: 'transparent',
  },
  related: {
    settings: PageHeaderSettings,
  },
};
