'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';

interface ImageProps {
  src: string;
  width?: string;
}

export const Image = ({ src = 'https://via.placeholder.com/150', width = '100%' }: ImageProps) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(drag(dom));
        }
      }}
      className={`my-2 inline-block ${selected ? 'outline-1 outline-blue-500' : ''}`}
      style={{ width }}
    >
      {/* biome-ignore lint/a11y/useAltText: needed */}
      <img src={src} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
};

export const ImageSettings = () => {
  const t = useTranslations('templates.editor.components.image');
  const {
    actions: { setProp },
    src,
    width,
  } = useNode((node) => ({
    src: node.data.props.src,
    width: node.data.props.width,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="src">
          {t('imageUrl')}
        </label>
        <input
          type="text"
          value={src}
          onChange={(e) =>
            setProp((props: ImageProps) => {
              props.src = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm font-mono"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="width">
          {t('width')}
        </label>
        <input
          type="text"
          value={width}
          onChange={(e) =>
            setProp((props: ImageProps) => {
              props.width = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm font-mono"
        />
      </div>
    </div>
  );
};

Image.craft = {
  props: {
    src: 'https://via.placeholder.com/150',
    width: '100%',
  },
  related: {
    settings: ImageSettings,
  },
};
