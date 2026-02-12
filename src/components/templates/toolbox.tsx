'use client';

import { Element, useEditor } from '@craftjs/core';
import { Image as ImageIcon, Layout, MousePointer2, TableIcon, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button as USER_COMPONENTS_Button } from './user-components/button';
import { Container } from './user-components/container';
import { Image } from './user-components/image';
import { Table } from './user-components/table';
import { Text } from './user-components/text';

export const Toolbox = () => {
  const { connectors } = useEditor();
  const t = useTranslations('templates.editor');

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('toolbox.title')}</div>
      <div className="grid grid-cols-2 gap-2">
        <div
          ref={(ref) => {
            if (ref) connectors.create(ref, <Element is={Container} canvas />);
          }}
          className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
        >
          <Layout className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
          <span className="text-xs font-medium">{t('toolbox.layout')}</span>
        </div>

        <div
          ref={(ref) => {
            if (ref) connectors.create(ref, <Text text={t('components.text.defaultText')} />);
          }}
          className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
        >
          <Type className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
          <span className="text-xs font-medium">{t('toolbox.text')}</span>
        </div>

        <div
          ref={(ref) => {
            if (ref) connectors.create(ref, <USER_COMPONENTS_Button text="Button" url="#" />);
          }}
          className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
        >
          <MousePointer2 className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
          <span className="text-xs font-medium">{t('toolbox.button')}</span>
        </div>

        <div
          ref={(ref) => {
            if (ref) connectors.create(ref, <Image src="https://via.placeholder.com/150" />);
          }}
          className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
        >
          <ImageIcon className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
          <span className="text-xs font-medium">{t('toolbox.image')}</span>
        </div>

        <div
          ref={(ref) => {
            if (ref) connectors.create(ref, <Table />);
          }}
          className="flex flex-col items-center justify-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-move transition-colors group"
        >
          <TableIcon className="w-5 h-5 mb-2 text-zinc-500 group-hover:text-zinc-900" />
          <span className="text-xs font-medium">{t('toolbox.table')}</span>
        </div>
      </div>
    </div>
  );
};
