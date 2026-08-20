import type { TemplateType } from '@prisma/client';
import type { Config, Slot } from '@puckeditor/core';
import type { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

type EditorTranslator = ReturnType<typeof useTranslations>;

type Layout = 'vertical' | 'horizontal' | 'grid';

export type TemplateComponentProps = {
  Container: {
    content: Slot;
    layout: Layout;
    gap: number;
    gridColumns: number;
    padding: number;
    background: string;
  };
  Text: {
    text: string;
    fontSize: number;
    color: string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
  };
  Button: {
    text: string;
    url: string;
    background: string;
    color: string;
  };
  Image: {
    src: string;
    width: string;
  };
  Table: {
    columns: number;
    rows: number;
  };
  PageHeader: {
    content: Slot;
    padding: number;
    background: string;
  };
  PageFooter: {
    content: Slot;
    padding: number;
    background: string;
  };
};

export type TemplateRootProps = {
  header: Slot;
  footer: Slot;
};

export type TemplateConfig = Config<TemplateComponentProps, TemplateRootProps>;

const layoutFlex = (layout: Layout, gap: number, gridColumns: number): CSSProperties => {
  if (layout === 'grid') {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(1, gridColumns)}, minmax(0, 1fr))`,
      gap,
    };
  }
  return {
    display: 'flex',
    flexDirection: layout === 'horizontal' ? 'row' : 'column',
    gap,
  };
};

export function getTemplateConfig(type: TemplateType, t: EditorTranslator): TemplateConfig {
  const isDocument = type === 'DOCUMENT';

  const config: TemplateConfig = {
    categories: {
      basic: {
        title: t('toolbox.tabBasic'),
        components: ['Container', 'Text', 'Button', 'Image', 'Table'],
        defaultExpanded: true,
      },
      other: {
        visible: false,
      },
    },
    components: {
      Container: {
        label: t('toolbox.layout'),
        fields: {
          content: { type: 'slot' },
          layout: {
            type: 'select',
            label: t('components.container.layout'),
            options: [
              { label: t('components.container.layout_vertical'), value: 'vertical' },
              { label: t('components.container.layout_horizontal'), value: 'horizontal' },
              { label: t('components.container.layout_grid'), value: 'grid' },
            ],
          },
          gap: { type: 'number', label: t('components.container.gap'), min: 0 },
          gridColumns: { type: 'number', label: t('components.container.gridColumns'), min: 1, max: 6 },
          padding: { type: 'number', label: t('components.container.padding'), min: 0 },
          background: { type: 'text', label: t('components.container.backgroundColor') },
        },
        defaultProps: {
          content: [],
          layout: 'vertical',
          gap: 8,
          gridColumns: 2,
          padding: 16,
          background: 'transparent',
        },
        render: ({ content: Content, layout, gap, gridColumns, padding, background }) => (
          <div style={{ ...layoutFlex(layout, gap, gridColumns), padding, background, minHeight: 40 }}>
            <Content minEmptyHeight={48} />
          </div>
        ),
      },
      Text: {
        label: t('toolbox.text'),
        fields: {
          text: {
            type: 'richtext',
            contentEditable: true,
            options: {
              heading: false,
              codeBlock: false,
              code: false,
              blockquote: false,
              horizontalRule: false,
              bulletList: false,
              orderedList: false,
            },
          },
          fontSize: { type: 'number', label: t('components.text.fontSize'), min: 8, max: 72 },
          color: { type: 'text', label: t('components.text.textColor') },
          textAlign: {
            type: 'radio',
            label: t('components.text.textAlign'),
            options: [
              { label: 'Links', value: 'left' },
              { label: 'Zentriert', value: 'center' },
              { label: 'Rechts', value: 'right' },
              { label: 'Blocksatz', value: 'justify' },
            ],
          },
        },
        defaultProps: {
          text: `<p>${t('components.text.defaultText')}</p>`,
          fontSize: 16,
          color: '#000000',
          textAlign: 'left',
        },
        render: ({ text, fontSize, color, textAlign }) => (
          <div style={{ fontSize, color, textAlign, lineHeight: 1.5 }}>{text}</div>
        ),
      },
      Button: {
        label: t('toolbox.button'),
        fields: {
          text: { type: 'text', label: t('toolbox.button') },
          url: { type: 'text', label: t('components.button.url') },
          background: { type: 'text', label: t('components.button.backgroundColor') },
          color: { type: 'text', label: t('components.button.textColor') },
        },
        defaultProps: {
          text: 'Button',
          url: '#',
          background: '#18181b',
          color: '#ffffff',
        },
        render: ({ text, url, background, color }) => (
          <a
            href={url}
            onClick={(event) => event.preventDefault()}
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background,
              color,
              textDecoration: 'none',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            {text}
          </a>
        ),
      },
      Image: {
        label: t('toolbox.image'),
        fields: {
          src: { type: 'text', label: t('components.image.imageUrl') },
          width: { type: 'text', label: t('components.image.width') },
        },
        defaultProps: {
          src: 'https://via.placeholder.com/150',
          width: '150px',
        },
        render: ({ src, width }) => (
          // biome-ignore lint/performance/noImgElement: template canvas preview, not a Next image asset
          <img src={src} alt="" style={{ width, maxWidth: '100%', height: 'auto', display: 'block' }} />
        ),
      },
      Table: {
        label: t('toolbox.table'),
        fields: {
          columns: { type: 'number', label: t('components.table.columns'), min: 1, max: 12 },
          rows: { type: 'number', label: t('components.table.rows'), min: 1, max: 50 },
        },
        defaultProps: {
          columns: 3,
          rows: 2,
        },
        render: ({ columns, rows }) => {
          const colCount = Math.max(1, columns);
          const rowCount = Math.max(1, rows);
          const headerKeys = Array.from({ length: colCount }, (_, index) => `header-${colCount}-${index}`);
          const rowKeys = Array.from({ length: rowCount }, (_, rowIndex) => `row-${rowCount}-${rowIndex}`);
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {headerKeys.map((headerKey, index) => (
                    <th
                      key={headerKey}
                      style={{ border: '1px solid #e4e4e7', padding: 8, textAlign: 'left', background: '#f4f4f5' }}
                    >
                      {t('components.table.defaultHeader')} {index + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowKeys.map((rowKey) => (
                  <tr key={rowKey}>
                    {headerKeys.map((headerKey) => (
                      <td key={`${rowKey}-${headerKey}`} style={{ border: '1px solid #e4e4e7', padding: 8 }}>
                        {t('components.table.cell')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        },
      },
      PageHeader: {
        label: t('components.pageHeader.label'),
        permissions: {
          delete: false,
          duplicate: false,
          drag: false,
        },
        fields: {
          content: { type: 'slot' },
          padding: { type: 'number', label: t('components.pageHeader.padding'), min: 0 },
          background: { type: 'text', label: t('components.pageHeader.backgroundColor') },
        },
        defaultProps: {
          content: [],
          padding: 16,
          background: '#ffffff',
        },
        render: ({ content: Content, padding, background }) => (
          <div style={{ padding, background, minHeight: 48, borderBottom: '1px solid #e4e4e7' }}>
            <Content minEmptyHeight={32} />
          </div>
        ),
      },
      PageFooter: {
        label: t('components.pageFooter.label'),
        permissions: {
          delete: false,
          duplicate: false,
          drag: false,
        },
        fields: {
          content: { type: 'slot' },
          padding: { type: 'number', label: t('components.pageFooter.padding'), min: 0 },
          background: { type: 'text', label: t('components.pageFooter.backgroundColor') },
        },
        defaultProps: {
          content: [],
          padding: 16,
          background: '#ffffff',
        },
        render: ({ content: Content, padding, background }) => (
          <div style={{ padding, background, minHeight: 48, borderTop: '1px solid #e4e4e7' }}>
            <Content minEmptyHeight={32} />
          </div>
        ),
      },
    },
    root: isDocument
      ? {
          fields: {
            header: { type: 'slot', allow: ['PageHeader'] },
            footer: { type: 'slot', allow: ['PageFooter'] },
          },
          defaultProps: {
            header: [
              {
                type: 'PageHeader',
                props: { id: 'page-header', content: [], padding: 16, background: '#ffffff' },
              },
            ],
            footer: [
              {
                type: 'PageFooter',
                props: { id: 'page-footer', content: [], padding: 16, background: '#ffffff' },
              },
            ],
          },
          render: ({ header: Header, footer: Footer, children }) => (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#ffffff' }}>
              <Header />
              <div style={{ flex: 1, padding: 56 }}>{children}</div>
              <Footer />
            </div>
          ),
        }
      : {
          render: ({ children }) => (
            <div style={{ minHeight: 600, background: '#ffffff', padding: 40 }}>{children}</div>
          ),
        },
  };

  return config;
}
