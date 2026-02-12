'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface PageFooterProps {
  padding?: number;
  background?: string;
  children?: ReactNode;
}

export const PageFooter = ({
  padding = 16,
  background = 'transparent',
  children,
}: PageFooterProps) => {
  const t = useTranslations('templates.editor.components.pageFooter');
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
      {/* Visual separator */}
      <div className="border-b border-dashed border-zinc-300 mx-4 relative">
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white text-[10px] text-zinc-400 px-2 pointer-events-none z-[2]">
          {t('label')}
        </span>
      </div>
      <div
        style={{
          padding: `${padding}px`,
          background,
        }}
        className="min-h-[40px] mt-1"
      >
        {children}
        {isEmpty && (
          <div className="py-4 border-2 border-dashed border-zinc-200 rounded flex items-center justify-center text-zinc-400 text-xs pointer-events-none w-full">
            {t('dropHere')}
          </div>
        )}
      </div>
    </div>
  );
};

export const PageFooterSettings = () => {
  const t = useTranslations('templates.editor.components.pageFooter');
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
        <label htmlFor="footerPadding" className="text-xs font-medium">
          {t('padding')}
        </label>
        <input
          id="footerPadding"
          type="number"
          value={padding}
          onChange={(e) =>
            setProp((props: PageFooterProps) => {
              props.padding = Number(e.target.value);
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="footerBg" className="text-xs font-medium">
          {t('backgroundColor')}
        </label>
        <input
          id="footerBg"
          type="color"
          value={background === 'transparent' ? '#ffffff' : background}
          onChange={(e) =>
            setProp((props: PageFooterProps) => {
              props.background = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>
    </div>
  );
};

PageFooter.craft = {
  isCanvas: true,
  props: {
    padding: 16,
    background: 'transparent',
  },
  related: {
    settings: PageFooterSettings,
  },
};
