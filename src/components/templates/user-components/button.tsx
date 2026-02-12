'use client';

import { useNode } from '@craftjs/core';
import { useTranslations } from 'next-intl';

interface ButtonProps {
  text: string;
  url: string;
  background?: string;
  color?: string;
}

export const Button = ({ text = 'Klick mich', url = '#', background = '#2563eb', color = '#ffffff' }: ButtonProps) => {
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
      className={`inline-block my-2 ${selected ? 'outline-1 outline-blue-500' : ''}`}
    >
      <a
        href={url}
        style={{
          backgroundColor: background,
          color,
          padding: '10px 20px',
          borderRadius: '4px',
          textDecoration: 'none',
          display: 'inline-block',
          fontWeight: 'bold',
        }}
        onClick={(e) => e.preventDefault()}
      >
        {text}
      </a>
    </div>
  );
};

export const ButtonSettings = () => {
  const t = useTranslations('templates.editor.components.button');
  const {
    actions: { setProp },
    text,
    url,
    background,
    color,
  } = useNode((node) => ({
    text: node.data.props.text,
    url: node.data.props.url,
    background: node.data.props.background,
    color: node.data.props.color,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="buttonText">
          {t('buttonText')}
        </label>
        <input
          id="buttonText"
          type="text"
          value={text}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.text = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="url">
          {t('url')}
        </label>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.url = e.target.value;
            })
          }
          className="w-full px-2 py-1 border rounded text-sm font-mono"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="background">
          {t('backgroundColor')}
        </label>
        <input
          id="background"
          type="color"
          value={background}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.background = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="color">
          {t('textColor')}
        </label>
        <input
          id="color"
          type="color"
          value={color}
          onChange={(e) =>
            setProp((props: ButtonProps) => {
              props.color = e.target.value;
            })
          }
          className="w-full h-8 p-0 border rounded"
        />
      </div>
    </div>
  );
};

Button.craft = {
  props: {
    text: 'Klick mich',
    url: '#',
    background: '#2563eb',
    color: '#ffffff',
  },
  related: {
    settings: ButtonSettings,
  },
};
