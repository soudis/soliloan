'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import {
  BORDER_STYLE_OPTIONS,
  type BorderProps,
  type BorderStyle,
  buildBorderStyle,
} from '@/lib/templates/border-utils';

interface PageFooterProps extends BorderProps {
  padding?: number;
  background?: string;
  children?: ReactNode;
}

export const PageFooter = ({
  padding = 16,
  background = 'transparent',
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderColor,
  borderStyle,
  borderWidth,
  children,
}: PageFooterProps) => {
  const t = useTranslations('templates.editor.components.pageFooter');
  const {
    connectors: { connect },
  } = useNode();

  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const borderStyleObj = useMemo(
    () =>
      buildBorderStyle({
        borderTop,
        borderRight,
        borderBottom,
        borderLeft,
        borderColor,
        borderStyle,
        borderWidth,
      }),
    [borderTop, borderRight, borderBottom, borderLeft, borderColor, borderStyle, borderWidth],
  );

  return (
    <div
      ref={(dom) => {
        if (dom) connect(dom);
      }}
      className="w-full"
    >
      <div className="mx-4 relative">
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white text-[10px] text-zinc-400 px-2 pointer-events-none z-[2]">
          {t('label')}
        </span>
      </div>
      <div
        style={{
          padding: `${padding}px`,
          background,
          ...borderStyleObj,
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
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    borderColor,
    borderStyle,
    borderWidth,
  } = useNode((node) => ({
    padding: node.data.props.padding,
    background: node.data.props.background,
    borderTop: node.data.props.borderTop ?? false,
    borderRight: node.data.props.borderRight ?? false,
    borderBottom: node.data.props.borderBottom ?? false,
    borderLeft: node.data.props.borderLeft ?? false,
    borderColor: node.data.props.borderColor ?? '#e4e4e7',
    borderStyle: (node.data.props.borderStyle as BorderStyle) ?? 'solid',
    borderWidth: node.data.props.borderWidth ?? 1,
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
      <div className="space-y-2">
        <label className="text-xs font-medium">{t('border')}</label>
        <div className="flex flex-wrap gap-2">
          {(['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const).map((side) => (
            <label key={side} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={Boolean(
                  ({ borderTop, borderRight, borderBottom, borderLeft } as Record<string, boolean>)[side],
                )}
                onChange={(e) =>
                  setProp((props: PageFooterProps) => {
                    (props as Record<string, boolean>)[side] = e.target.checked;
                  })
                }
                className="rounded border-zinc-300"
              />
              {t(side)}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label htmlFor="footerBorderColor" className="text-[11px] text-zinc-600">
              {t('borderColor')}
            </label>
            <input
              id="footerBorderColor"
              type="color"
              value={borderColor ?? '#e4e4e7'}
              onChange={(e) =>
                setProp((props: PageFooterProps) => {
                  props.borderColor = e.target.value;
                })
              }
              className="w-full h-7 rounded border"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="footerBorderWidth" className="text-[11px] text-zinc-600">
              {t('borderWidth')}
            </label>
            <input
              id="footerBorderWidth"
              type="number"
              min={1}
              max={20}
              value={borderWidth ?? 1}
              onChange={(e) =>
                setProp((props: PageFooterProps) => {
                  props.borderWidth = Number(e.target.value);
                })
              }
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="footerBorderStyle" className="text-[11px] text-zinc-600">
            {t('borderStyle')}
          </label>
          <select
            id="footerBorderStyle"
            value={borderStyle ?? 'solid'}
            onChange={(e) =>
              setProp((props: PageFooterProps) => {
                props.borderStyle = e.target.value as BorderStyle;
              })
            }
            className="w-full px-2 py-1 border rounded text-sm"
          >
            {BORDER_STYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`borderStyle_${opt}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

PageFooter.craft = {
  isCanvas: true,
  props: {
    padding: 16,
    background: 'transparent',
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderColor: '#e4e4e7',
    borderStyle: 'solid' as BorderStyle,
    borderWidth: 1,
  },
  related: {
    settings: PageFooterSettings,
  },
};
