'use client';

import { useNode } from '@craftjs/core';
import { ArrowDown, ArrowRight, Grid3X3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  type BorderProps,
  type BorderStyle,
  BORDER_STYLE_OPTIONS,
  buildBorderStyle,
} from '@/lib/templates/border-utils';

type LayoutMode = 'vertical' | 'horizontal' | 'grid';

interface ContainerProps extends BorderProps {
  padding?: number;
  background?: string;
  layout?: LayoutMode;
  gap?: number;
  gridColumns?: number;
  children?: ReactNode;
}

// Helper function to parse color string to rgba values
const parseColor = (color: string | undefined): { r: number; g: number; b: number; a: number } => {
  if (!color || color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Handle rgba format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: Number.parseInt(rgbaMatch[1], 10),
      g: Number.parseInt(rgbaMatch[2], 10),
      b: Number.parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] ? Number.parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Handle hex format
  const hexMatch = color.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: Number.parseInt(hex.substring(0, 2), 16),
      g: Number.parseInt(hex.substring(2, 4), 16),
      b: Number.parseInt(hex.substring(4, 6), 16),
      a: 1,
    };
  }

  // Default to transparent
  return { r: 0, g: 0, b: 0, a: 0 };
};

// Helper function to convert rgba to hex (for color picker)
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

// Helper function to convert rgba to rgba string
const rgbaToString = (r: number, g: number, b: number, a: number): string => {
  if (a === 0) {
    return 'transparent';
  }
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Build the inline style object for the container based on layout mode */
const buildLayoutStyle = (
  layout: LayoutMode,
  gap: number,
  gridColumns: number,
): React.CSSProperties => {
  switch (layout) {
    case 'horizontal':
      return {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: `${gap}px`,
      };
    case 'grid':
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: `${gap}px`,
      };
    case 'vertical':
    default:
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
      };
  }
};

export const Container = ({
  padding = 20,
  background = 'transparent',
  layout = 'vertical',
  gap = 0,
  gridColumns = 2,
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderColor,
  borderStyle,
  borderWidth,
  children,
}: ContainerProps) => {
  const t = useTranslations('templates.editor.components.container');
  const {
    connectors: { connect },
  } = useNode();

  const layoutStyle = useMemo(() => buildLayoutStyle(layout, gap, gridColumns), [layout, gap, gridColumns]);
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
        if (dom) {
          connect(dom);
        }
      }}
      style={{
        padding: `${padding}px`,
        background,
        ...layoutStyle,
        ...borderStyleObj,
      }}
      className="min-h-[50px] w-full"
    >
      {children}
      {(!children || (Array.isArray(children) && children.length === 0)) && (
        <div className="py-12 border-2 border-dashed border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm pointer-events-none w-full">
          {t('dropHere')}
        </div>
      )}
    </div>
  );
};

// ─── Layout toggle button ────────────────────────────────────────────────────

const LAYOUT_OPTIONS: { value: LayoutMode; icon: typeof ArrowDown }[] = [
  { value: 'vertical', icon: ArrowDown },
  { value: 'horizontal', icon: ArrowRight },
  { value: 'grid', icon: Grid3X3 },
];

const LayoutButton = ({
  value,
  icon: Icon,
  isActive,
  label,
  onClick,
}: {
  value: LayoutMode;
  icon: typeof ArrowDown;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`flex items-center justify-center p-2 rounded-md border transition-colors ${
      isActive
        ? 'bg-zinc-900 text-white border-zinc-900'
        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// ─── Settings ────────────────────────────────────────────────────────────────

export const ContainerSettings = () => {
  const t = useTranslations('templates.editor.components.container');
  const {
    actions: { setProp },
    padding,
    background,
    layout,
    gap,
    gridColumns,
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
    layout: (node.data.props.layout as LayoutMode) ?? 'vertical',
    gap: node.data.props.gap ?? 0,
    gridColumns: node.data.props.gridColumns ?? 2,
    borderTop: node.data.props.borderTop ?? false,
    borderRight: node.data.props.borderRight ?? false,
    borderBottom: node.data.props.borderBottom ?? false,
    borderLeft: node.data.props.borderLeft ?? false,
    borderColor: node.data.props.borderColor ?? '#e4e4e7',
    borderStyle: (node.data.props.borderStyle as BorderStyle) ?? 'solid',
    borderWidth: node.data.props.borderWidth ?? 1,
  }));

  // Parse the current background color
  const colorValues = useMemo(() => parseColor(background), [background]);
  const [localColor, setLocalColor] = useState(colorValues);

  // Update local color when background prop changes
  useEffect(() => {
    setLocalColor(colorValues);
  }, [colorValues]);

  const handleColorChange = (hex: string) => {
    const hexMatch = hex.match(/^#([0-9A-Fa-f]{6})$/);
    if (hexMatch) {
      const newColor = {
        ...localColor,
        r: Number.parseInt(hexMatch[1].substring(0, 2), 16),
        g: Number.parseInt(hexMatch[1].substring(2, 4), 16),
        b: Number.parseInt(hexMatch[1].substring(4, 6), 16),
      };
      setLocalColor(newColor);
      setProp((props: ContainerProps) => {
        props.background = rgbaToString(newColor.r, newColor.g, newColor.b, newColor.a);
      });
    }
  };

  const handleOpacityChange = (opacity: number) => {
    const newColor = { ...localColor, a: opacity / 100 };
    setLocalColor(newColor);
    setProp((props: ContainerProps) => {
      props.background = rgbaToString(newColor.r, newColor.g, newColor.b, newColor.a);
    });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Layout mode */}
      <div className="space-y-2">
        <label className="text-xs font-medium">{t('layout')}</label>
        <div className="flex gap-2">
          {LAYOUT_OPTIONS.map((opt) => (
            <LayoutButton
              key={opt.value}
              value={opt.value}
              icon={opt.icon}
              isActive={layout === opt.value}
              label={t(`layout_${opt.value}`)}
              onClick={() =>
                setProp((props: ContainerProps) => {
                  props.layout = opt.value;
                })
              }
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{t(`layout_${layout}`)}</p>
      </div>

      {/* Gap */}
      <div className="space-y-2">
        <label htmlFor="gap" className="text-xs font-medium">
          {t('gap')}
        </label>
        <input
          id="gap"
          type="number"
          min={0}
          value={gap}
          onChange={(e) =>
            setProp((props: ContainerProps) => {
              props.gap = Number(e.target.value);
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      {/* Grid columns (only for grid layout) */}
      {layout === 'grid' && (
        <div className="space-y-2">
          <label htmlFor="gridColumns" className="text-xs font-medium">
            {t('gridColumns')}
          </label>
          <input
            id="gridColumns"
            type="number"
            min={1}
            max={12}
            value={gridColumns}
            onChange={(e) =>
              setProp((props: ContainerProps) => {
                props.gridColumns = Number(e.target.value);
              })
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      )}

      {/* Padding */}
      <div className="space-y-2">
        <label htmlFor="padding" className="text-xs font-medium">
          {t('padding')}
        </label>
        <input
          id="padding"
          type="number"
          value={padding}
          onChange={(e) =>
            setProp((props: ContainerProps) => {
              props.padding = Number(e.target.value);
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      {/* Background color */}
      <div className="space-y-2">
        <label htmlFor="background" className="text-xs font-medium">
          {t('backgroundColor')}
        </label>
        <input
          id="background"
          type="color"
          value={rgbToHex(localColor.r, localColor.g, localColor.b)}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-full h-8 p-0 border rounded"
        />
        <div className="space-y-1">
          <label htmlFor="opacity" className="text-xs text-zinc-600">
            {t('opacity')} ({Math.round(localColor.a * 100)}%)
          </label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="100"
            value={Math.round(localColor.a * 100)}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <label className="text-xs font-medium">{t('border')}</label>
        <div className="flex flex-wrap gap-2">
          {(['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const).map((side) => (
            <label key={side} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={Boolean(({ borderTop, borderRight, borderBottom, borderLeft } as Record<string, boolean>)[side])}
                onChange={(e) =>
                  setProp((props: ContainerProps) => {
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
            <label htmlFor="containerBorderColor" className="text-[11px] text-zinc-600">
              {t('borderColor')}
            </label>
            <input
              id="containerBorderColor"
              type="color"
              value={borderColor ?? '#e4e4e7'}
              onChange={(e) =>
                setProp((props: ContainerProps) => {
                  props.borderColor = e.target.value;
                })
              }
              className="w-full h-7 rounded border"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="containerBorderWidth" className="text-[11px] text-zinc-600">
              {t('borderWidth')}
            </label>
            <input
              id="containerBorderWidth"
              type="number"
              min={1}
              max={20}
              value={borderWidth ?? 1}
              onChange={(e) =>
                setProp((props: ContainerProps) => {
                  props.borderWidth = Number(e.target.value);
                })
              }
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="containerBorderStyle" className="text-[11px] text-zinc-600">
            {t('borderStyle')}
          </label>
          <select
            id="containerBorderStyle"
            value={borderStyle ?? 'solid'}
            onChange={(e) =>
              setProp((props: ContainerProps) => {
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

Container.craft = {
  isCanvas: true,
  props: {
    padding: 20,
    background: 'transparent',
    layout: 'vertical' as LayoutMode,
    gap: 0,
    gridColumns: 2,
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderColor: '#e4e4e7',
    borderStyle: 'solid' as BorderStyle,
    borderWidth: 1,
  },
  related: {
    settings: ContainerSettings,
  },
};
