'use client';

import {
  AlignCenter,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween,
  ArrowDown,
  ArrowRight,
  Grid3X3,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockPaddingFields } from '../../block-padding-fields';
import type { FlexAlign, FlexJustify, LayoutMode } from '../blocks/container-block';
import { BorderField } from '../fields/border-field';
import { LoopKeyField } from '../fields/loop-key-field';
import { SaveAsBlockField } from '../fields/save-as-block-field';
import { usePatchSelectedProps, useSelectedComponentType, useSelectedRecord } from '../use-puck-selected';
import { parseColor, rgbaToString, rgbToHex } from './color-utils';
import { LayoutButton, ToggleButton } from './icon-toggle';
import { usePaddingAdapter } from './use-padding-adapter';

const LAYOUT_OPTIONS: { value: LayoutMode; icon: typeof ArrowDown }[] = [
  { value: 'vertical', icon: ArrowDown },
  { value: 'horizontal', icon: ArrowRight },
  { value: 'grid', icon: Grid3X3 },
];

const JUSTIFY_OPTIONS: { value: FlexJustify; iconV: typeof ArrowDown; iconH: typeof ArrowDown }[] = [
  { value: 'flex-start', iconV: AlignStartHorizontal, iconH: AlignStartVertical },
  { value: 'center', iconV: AlignCenter, iconH: AlignCenter },
  { value: 'flex-end', iconV: AlignEndHorizontal, iconH: AlignEndVertical },
  { value: 'space-between', iconV: AlignVerticalSpaceBetween, iconH: AlignHorizontalSpaceBetween },
  { value: 'space-around', iconV: AlignVerticalSpaceAround, iconH: AlignHorizontalSpaceAround },
];

const ALIGN_OPTIONS: { value: FlexAlign; iconV: typeof ArrowDown; iconH: typeof ArrowDown }[] = [
  { value: 'flex-start', iconV: AlignStartVertical, iconH: AlignStartHorizontal },
  { value: 'center', iconV: AlignCenter, iconH: AlignCenter },
  { value: 'flex-end', iconV: AlignEndVertical, iconH: AlignEndHorizontal },
  { value: 'stretch', iconV: AlignHorizontalSpaceBetween, iconH: AlignVerticalSpaceBetween },
];

export function ContainerSettings() {
  const t = useTranslations('templates.editor.components.container');
  const patch = usePatchSelectedProps();
  const type = useSelectedComponentType();
  const props = useSelectedRecord();
  const { paddingProps, setProp } = usePaddingAdapter();
  const isStructural = type === 'Body';

  const layout = (props.layout as LayoutMode) ?? 'vertical';
  const gap = Number(props.gap ?? 0);
  const gridColumns = Number(props.gridColumns ?? 2);
  const justifyContent = (props.justifyContent as FlexJustify) ?? 'flex-start';
  const alignItems = (props.alignItems as FlexAlign) ?? 'stretch';
  const background = String(props.background ?? 'transparent');

  const colorValues = useMemo(() => parseColor(background), [background]);
  const [localColor, setLocalColor] = useState(colorValues);

  useEffect(() => {
    setLocalColor(colorValues);
  }, [colorValues]);

  const handleColorChange = (hex: string) => {
    const hexMatch = hex.match(/^#([0-9A-Fa-f]{6})$/);
    if (!hexMatch) return;
    const next = {
      ...localColor,
      r: Number.parseInt(hexMatch[1].substring(0, 2), 16),
      g: Number.parseInt(hexMatch[1].substring(2, 4), 16),
      b: Number.parseInt(hexMatch[1].substring(4, 6), 16),
    };
    setLocalColor(next);
    patch({ background: rgbaToString(next.r, next.g, next.b, next.a) });
  };

  const handleOpacityChange = (opacity: number) => {
    const next = { ...localColor, a: opacity / 100 };
    setLocalColor(next);
    patch({ background: rgbaToString(next.r, next.g, next.b, next.a) });
  };

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="layout">
        <TabsList variant="modern" className="mt-0">
          <TabsTrigger variant="modern" size="sm" value="layout">
            {t('tabLayout')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="style">
            {t('tabStyle')}
          </TabsTrigger>
          {!isStructural && (
            <TabsTrigger variant="modern" size="sm" value="block">
              {t('tabBlock')}
            </TabsTrigger>
          )}
          {!isStructural && (
            <TabsTrigger variant="modern" size="sm" value="data">
              {t('tabData')}
            </TabsTrigger>
          )}
        </TabsList>

        {!isStructural && (
          <TabsContent value="data" className="mt-3 space-y-4">
            <LoopKeyField />
          </TabsContent>
        )}

        <TabsContent value="layout" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="layout">
              {t('layout')}
            </label>
            <div className="flex gap-2">
              {LAYOUT_OPTIONS.map((option) => (
                <LayoutButton
                  key={option.value}
                  icon={option.icon}
                  isActive={layout === option.value}
                  label={t(`layout_${option.value}`)}
                  onClick={() => patch({ layout: option.value })}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t(`layout_${layout}`)}</p>
          </div>

          {layout !== 'grid' && (
            <div className="space-y-2">
              <span className="text-xs font-medium">{t('distribution')}</span>
              <div className="flex gap-1">
                {JUSTIFY_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option.value}
                    icon={layout === 'vertical' ? option.iconV : option.iconH}
                    isActive={justifyContent === option.value}
                    label={t(`justify_${option.value}`)}
                    onClick={() => patch({ justifyContent: option.value })}
                  />
                ))}
              </div>
            </div>
          )}

          {layout !== 'grid' && (
            <div className="space-y-2">
              <span className="text-xs font-medium">{t('alignment')}</span>
              <div className="flex gap-1">
                {ALIGN_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option.value}
                    icon={layout === 'vertical' ? option.iconV : option.iconH}
                    isActive={alignItems === option.value}
                    label={t(`align_${option.value}`)}
                    onClick={() => patch({ alignItems: option.value })}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="gap" className="text-xs font-medium">
              {t('gap')}
            </label>
            <input
              id="gap"
              type="number"
              min={0}
              value={gap}
              onChange={(event) => patch({ gap: Number(event.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>

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
                onChange={(event) => patch({ gridColumns: Number(event.target.value) })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          )}

          <BlockPaddingFields idPrefix="container" props={paddingProps} setProp={setProp} />
        </TabsContent>

        <TabsContent value="style" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label htmlFor="background" className="text-xs font-medium">
              {t('backgroundColor')}
            </label>
            <input
              id="background"
              type="color"
              value={rgbToHex(localColor.r, localColor.g, localColor.b)}
              onChange={(event) => handleColorChange(event.target.value)}
              className="h-8 w-full rounded border p-0"
            />
            <div className="space-y-1">
              <label htmlFor="opacity" className="text-xs text-muted-foreground">
                {t('opacity')} ({Math.round(localColor.a * 100)}%)
              </label>
              <input
                id="opacity"
                type="range"
                min="0"
                max="100"
                value={Math.round(localColor.a * 100)}
                onChange={(event) => handleOpacityChange(Number(event.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <BorderField translationPrefix="templates.editor.components.container" />
        </TabsContent>

        {!isStructural && (
          <TabsContent value="block" className="mt-3">
            <SaveAsBlockField />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
