'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ContainerProps {
  padding?: number;
  background?: string;
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

export const Container = ({ padding = 20, background = 'transparent', children }: ContainerProps) => {
  const t = useTranslations('templates.editor.components.container');
  const {
    connectors: { connect },
  } = useNode();

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
      }}
      className="min-h-[50px] w-full"
    >
      {children}
      {(!children || (Array.isArray(children) && children.length === 0)) && (
        <div className="py-12 border-2 border-dashed border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm pointer-events-none">
          {t('dropHere')}
        </div>
      )}
    </div>
  );
};

export const ContainerSettings = () => {
  const t = useTranslations('templates.editor.components.container');
  const {
    actions: { setProp },
    padding,
    background,
  } = useNode((node) => ({
    padding: node.data.props.padding,
    background: node.data.props.background,
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
    </div>
  );
};

Container.craft = {
  isCanvas: true,
  props: {
    padding: 20,
    background: 'transparent',
  },
  related: {
    settings: ContainerSettings,
  },
};
