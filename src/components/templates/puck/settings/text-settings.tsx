'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockPaddingFields } from '../../block-padding-fields';
import { ShowIfField } from '../fields/show-if-field';
import type { TextAlign } from '../table-model';
import { usePatchSelectedProps, useSelectedRecord } from '../use-puck-selected';
import { TextAlignButtons } from './text-align-buttons';
import { usePaddingAdapter } from './use-padding-adapter';

export function TextSettings() {
  const t = useTranslations('templates.editor.components.text');
  const patch = usePatchSelectedProps();
  const props = useSelectedRecord();
  const { paddingProps, setProp } = usePaddingAdapter();
  const fontSize = Number(props.fontSize ?? 16);
  const color = String(props.color ?? '#000000');
  const textAlign = (props.textAlign as TextAlign) ?? 'left';

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="style">
        <TabsList variant="modern" className="mt-0">
          <TabsTrigger variant="modern" size="sm" value="style">
            {t('tabStyle')}
          </TabsTrigger>
          <TabsTrigger variant="modern" size="sm" value="data">
            {t('tabData')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-3 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium" htmlFor="fontSize">
              {t('fontSize')}
            </label>
            <input
              id="fontSize"
              type="number"
              value={fontSize}
              onChange={(event) => patch({ fontSize: Number.parseInt(event.target.value, 10) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium" htmlFor="color">
              {t('textColor')}
            </label>
            <input
              id="color"
              type="color"
              value={color.startsWith('#') ? color : '#000000'}
              onChange={(event) => patch({ color: event.target.value })}
              className="h-8 w-full rounded border p-0"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium" htmlFor="textAlign">
              {t('textAlign')}
            </label>
            <TextAlignButtons value={textAlign} onChange={(next) => patch({ textAlign: next })} />
          </div>
          <BlockPaddingFields idPrefix="text" props={paddingProps} setProp={setProp} />
        </TabsContent>

        <TabsContent value="data" className="mt-3">
          <ShowIfField />
        </TabsContent>
      </Tabs>
    </div>
  );
}
