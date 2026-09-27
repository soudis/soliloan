'use client';

import type { TemplateType } from '@prisma/client';
import { type Config, RichTextMenu, type Slot } from '@puckeditor/core';
import type { Editor } from '@tiptap/react';
import type { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { WithConditionBadge } from '@/components/templates/puck/blocks/condition-badge';
import {
  ContainerBlock,
  type FlexAlign,
  type FlexJustify,
  type LayoutMode,
} from '@/components/templates/puck/blocks/container-block';
import { ImageBlock } from '@/components/templates/puck/blocks/image-block';
import { TableBlock } from '@/components/templates/puck/blocks/table-block';
import { TextBlock } from '@/components/templates/puck/blocks/text-block';
import { ZoneBlock } from '@/components/templates/puck/blocks/zone-block';
import { BorderField } from '@/components/templates/puck/fields/border-field';
import { ButtonSettingsField } from '@/components/templates/puck/fields/button-settings-field';
import { ColumnWidthsField } from '@/components/templates/puck/fields/column-widths-field';
import { ImageSourceField } from '@/components/templates/puck/fields/image-source-field';
import { LoopKeyField } from '@/components/templates/puck/fields/loop-key-field';
import { createMergeTagExtension, MergeTagMenuControl } from '@/components/templates/puck/fields/merge-tag-richtext';
import { PaddingField } from '@/components/templates/puck/fields/padding-field';
import { SaveAsBlockField } from '@/components/templates/puck/fields/save-as-block-field';
import { ShowIfField } from '@/components/templates/puck/fields/show-if-field';
import { TableCellStyleField } from '@/components/templates/puck/fields/table-cell-field';
import { TemplateConditionMenuControl } from '@/components/templates/puck/fields/template-condition-menu';
import { resizeTableArrays, type TableCellStyle, type TextAlign } from '@/components/templates/puck/table-model';
import { TemplateCondition as TemplateConditionNode } from '@/components/templates/user-components/tiptap/template-condition-extension';
import {
  type BorderFieldProps,
  DEFAULT_BORDER,
  DEFAULT_PADDING,
  DEFAULT_TABLE_BORDER,
  type DisplayNameProps,
  getDefaultBodyProps,
  getDefaultPageZoneProps,
  type PaddingProps,
} from '@/lib/templates/puck-defaults';
import type { TemplateCondition } from '@/lib/templates/template-condition';

type EditorTranslator = ReturnType<typeof useTranslations>;

type ShowIfProps = { showIf?: TemplateCondition };

const showIfPuckField = { type: 'custom' as const, render: () => <ShowIfField /> };

export type TemplateComponentProps = {
  Container: {
    content: Slot;
    loopKey: string;
    layout: LayoutMode;
    gap: number;
    gridColumns: number;
    justifyContent: FlexJustify;
    alignItems: FlexAlign;
    background: string;
    saveAsBlock?: string;
  } & PaddingProps &
    BorderFieldProps &
    DisplayNameProps &
    ShowIfProps;
  Body: {
    content: Slot;
    layout: LayoutMode;
    gap: number;
    gridColumns: number;
    justifyContent: FlexJustify;
    alignItems: FlexAlign;
    background: string;
  } & PaddingProps &
    BorderFieldProps &
    DisplayNameProps &
    ShowIfProps;
  Text: {
    text: string;
    fontSize: number;
    color: string;
    textAlign: TextAlign;
  } & DisplayNameProps &
    ShowIfProps;
  Button: {
    text: string;
    url: string;
    background: string;
    color: string;
    useSystemUrl: boolean;
    systemUrlKey: string;
    settings?: string;
  } & DisplayNameProps &
    ShowIfProps;
  Image: {
    src: string;
    width: string;
    useLogoSource: boolean;
    source?: string;
  } & DisplayNameProps &
    ShowIfProps;
  Table: {
    loopKey: string;
    columns: number;
    rows: number;
    headerTexts: string[];
    cellTexts: string[][];
    headerStyles: TableCellStyle[];
    cellStyles: TableCellStyle[][];
    columnWidths: number[];
    textAlign: TextAlign;
    cellStyle?: string;
    _activeCellId?: string | null;
  } & PaddingProps &
    BorderFieldProps &
    DisplayNameProps &
    ShowIfProps;
  PageHeader: {
    content: Slot;
    background: string;
  } & PaddingProps &
    BorderFieldProps &
    DisplayNameProps &
    ShowIfProps;
  PageFooter: {
    content: Slot;
    background: string;
  } & PaddingProps &
    BorderFieldProps &
    DisplayNameProps &
    ShowIfProps;
};

export type TemplateRootProps = {
  header: Slot;
  footer: Slot;
};

export type TemplateConfig = Config<TemplateComponentProps, TemplateRootProps>;

const ZONE_DISALLOW = ['PageHeader', 'PageFooter', 'Body'];

function richtextField(t: EditorTranslator) {
  return {
    type: 'richtext' as const,
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
    tiptap: {
      extensions: [createMergeTagExtension(t('mergeTags.loopBodyPlaceholder')), TemplateConditionNode],
    },
    renderInlineMenu: ({ children, editor }: { children: ReactNode; editor: Editor | null }) => (
      <RichTextMenu>
        {children}
        <RichTextMenu.Group>
          <MergeTagMenuControl editor={editor} />
          <TemplateConditionMenuControl editor={editor} />
        </RichTextMenu.Group>
      </RichTextMenu>
    ),
  };
}

export function getTemplateConfig(type: TemplateType, t: EditorTranslator): TemplateConfig {
  const isDocument = type === 'DOCUMENT';

  return {
    categories: {
      basic: {
        title: t('toolbox.tabBasic'),
        components: ['Container', 'Text', 'Button', 'Image', 'Table'],
        defaultExpanded: true,
      },
      other: { visible: false },
    },
    components: {
      Container: {
        label: t('toolbox.layout'),
        resolveFields: (
          data: { props: TemplateComponentProps['Container'] },
          { fields }: { fields: Record<string, unknown> },
        ) => {
          if (data.props.layout === 'grid') {
            const { justifyContent: _justify, alignItems: _align, ...rest } = fields;
            return rest;
          }
          const { gridColumns: _gridColumns, ...rest } = fields;
          return rest;
        },
        fields: {
          content: { type: 'slot', visible: false, disallow: ZONE_DISALLOW, label: t('hierarchy.zones.content') },
          loopKey: { type: 'custom', render: () => <LoopKeyField /> },
          showIf: showIfPuckField,
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
          justifyContent: {
            type: 'select',
            label: t('components.container.distribution'),
            options: [
              { label: t('components.container.justify_flex-start'), value: 'flex-start' },
              { label: t('components.container.justify_center'), value: 'center' },
              { label: t('components.container.justify_flex-end'), value: 'flex-end' },
              { label: t('components.container.justify_space-between'), value: 'space-between' },
              { label: t('components.container.justify_space-around'), value: 'space-around' },
            ],
          },
          alignItems: {
            type: 'select',
            label: t('components.container.alignment'),
            options: [
              { label: t('components.container.align_flex-start'), value: 'flex-start' },
              { label: t('components.container.align_center'), value: 'center' },
              { label: t('components.container.align_flex-end'), value: 'flex-end' },
              { label: t('components.container.align_stretch'), value: 'stretch' },
            ],
          },
          padding: { type: 'custom', render: () => <PaddingField /> },
          background: { type: 'text', label: t('components.container.backgroundColor') },
          borderColor: {
            type: 'custom',
            render: () => <BorderField translationPrefix="templates.editor.components.container" />,
          },
          saveAsBlock: { type: 'custom', render: () => <SaveAsBlockField /> },
        },
        defaultProps: {
          content: [],
          displayName: '',
          loopKey: '',
          layout: 'vertical',
          gap: 8,
          gridColumns: 2,
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          background: 'transparent',
          showIf: [],
          ...DEFAULT_PADDING,
          ...DEFAULT_BORDER,
        },
        render: (props: ComponentProps<typeof ContainerBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <ContainerBlock {...props} />
          </WithConditionBadge>
        ),
      },
      Body: {
        label: t('components.pageBody.label'),
        permissions: { delete: false, duplicate: false, drag: false },
        resolveFields: (
          data: { props: TemplateComponentProps['Body'] },
          { fields }: { fields: Record<string, unknown> },
        ) => {
          if (data.props.layout === 'grid') {
            const { justifyContent: _justify, alignItems: _align, ...rest } = fields;
            return rest;
          }
          const { gridColumns: _gridColumns, ...rest } = fields;
          return rest;
        },
        fields: {
          content: { type: 'slot', visible: false, disallow: ZONE_DISALLOW, label: t('hierarchy.zones.content') },
          showIf: showIfPuckField,
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
          justifyContent: {
            type: 'select',
            label: t('components.container.distribution'),
            options: [
              { label: t('components.container.justify_flex-start'), value: 'flex-start' },
              { label: t('components.container.justify_center'), value: 'center' },
              { label: t('components.container.justify_flex-end'), value: 'flex-end' },
              { label: t('components.container.justify_space-between'), value: 'space-between' },
              { label: t('components.container.justify_space-around'), value: 'space-around' },
            ],
          },
          alignItems: {
            type: 'select',
            label: t('components.container.alignment'),
            options: [
              { label: t('components.container.align_flex-start'), value: 'flex-start' },
              { label: t('components.container.align_center'), value: 'center' },
              { label: t('components.container.align_flex-end'), value: 'flex-end' },
              { label: t('components.container.align_stretch'), value: 'stretch' },
            ],
          },
          padding: { type: 'custom', render: () => <PaddingField /> },
          background: { type: 'text', label: t('components.container.backgroundColor') },
          borderColor: {
            type: 'custom',
            render: () => <BorderField translationPrefix="templates.editor.components.container" />,
          },
        },
        defaultProps: { ...getDefaultBodyProps(), showIf: [] },
        render: (props: ComponentProps<typeof ContainerBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <ContainerBlock {...props} />
          </WithConditionBadge>
        ),
      },
      Text: {
        label: t('toolbox.text'),
        fields: {
          showIf: showIfPuckField,
          text: richtextField(t),
          fontSize: { type: 'number', label: t('components.text.fontSize'), min: 8, max: 72 },
          color: { type: 'text', label: t('components.text.textColor') },
          textAlign: {
            type: 'radio',
            label: t('components.text.textAlign'),
            options: [
              { label: t('components.text.align_left'), value: 'left' },
              { label: t('components.text.align_center'), value: 'center' },
              { label: t('components.text.align_right'), value: 'right' },
              { label: t('components.text.align_justify'), value: 'justify' },
            ],
          },
        },
        defaultProps: {
          displayName: '',
          text: `<p>${t('components.text.defaultText')}</p>`,
          fontSize: 16,
          color: '#000000',
          textAlign: 'left',
          showIf: [],
        },
        render: (props: ComponentProps<typeof TextBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <TextBlock {...props} />
          </WithConditionBadge>
        ),
      },
      Button: {
        label: t('toolbox.button'),
        fields: {
          showIf: showIfPuckField,
          settings: { type: 'custom', render: () => <ButtonSettingsField /> },
          background: { type: 'text', label: t('components.button.backgroundColor') },
          color: { type: 'text', label: t('components.button.textColor') },
        },
        defaultProps: {
          displayName: '',
          text: t('components.button.defaultText'),
          url: '#',
          background: '#2563eb',
          color: '#ffffff',
          useSystemUrl: false,
          systemUrlKey: '',
          showIf: [],
        },
        render: ({
          text,
          url,
          background,
          color,
          useSystemUrl,
          systemUrlKey,
          showIf,
        }: TemplateComponentProps['Button']) => (
          <WithConditionBadge showIf={showIf}>
            <a
              href={useSystemUrl && systemUrlKey ? `{{system.${systemUrlKey}}}` : url}
              onClick={(event) => event.preventDefault()}
              style={{
                display: 'inline-block',
                margin: '8px 0',
                padding: '10px 20px',
                background,
                color,
                textDecoration: 'none',
                borderRadius: 4,
                fontWeight: 'bold',
              }}
            >
              {text}
            </a>
          </WithConditionBadge>
        ),
      },
      Image: {
        label: t('toolbox.image'),
        fields: {
          showIf: showIfPuckField,
          source: { type: 'custom', render: () => <ImageSourceField /> },
          width: { type: 'text', label: t('components.image.width') },
        },
        defaultProps: {
          displayName: '',
          src: '',
          width: '100%',
          useLogoSource: true,
          showIf: [],
        },
        render: (props: ComponentProps<typeof ImageBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <ImageBlock {...props} />
          </WithConditionBadge>
        ),
      },
      Table: {
        label: t('toolbox.table'),
        resolveData: ({ props }: { props: TemplateComponentProps['Table'] }) => {
          const withForcedRows =
            typeof props.loopKey === 'string' && props.loopKey.trim() && props.rows !== 1
              ? { ...props, rows: 1 }
              : props;
          return { props: resizeTableArrays(withForcedRows) };
        },
        resolveFields: (
          data: { props: TemplateComponentProps['Table'] },
          { fields }: { fields: Record<string, unknown> },
        ) => {
          if (typeof data.props.loopKey === 'string' && data.props.loopKey.trim()) {
            const { rows: _rows, ...rest } = fields;
            return rest;
          }
          return fields;
        },
        fields: {
          showIf: showIfPuckField,
          loopKey: {
            type: 'custom',
            render: () => (
              <LoopKeyField translationPrefix="templates.editor.components.table" emptyOptionKey="staticTable" />
            ),
          },
          columns: { type: 'number', label: t('components.table.columns'), min: 1, max: 12 },
          rows: { type: 'number', label: t('components.table.rows'), min: 1, max: 50 },
          columnWidths: { type: 'custom', render: () => <ColumnWidthsField /> },
          padding: { type: 'custom', render: () => <PaddingField /> },
          borderColor: {
            type: 'custom',
            render: () => <BorderField translationPrefix="templates.editor.components.table" />,
          },
          cellStyle: { type: 'custom', render: () => <TableCellStyleField /> },
        },
        defaultProps: {
          displayName: '',
          loopKey: '',
          columns: 3,
          rows: 1,
          headerTexts: ['Spalte 1', 'Spalte 2', 'Spalte 3'],
          cellTexts: [['', '', '']],
          headerStyles: [],
          cellStyles: [],
          columnWidths: [33, 33, 34],
          textAlign: 'left',
          padding: 0,
          showIf: [],
          ...DEFAULT_TABLE_BORDER,
        },
        render: (props: ComponentProps<typeof TableBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <TableBlock {...props} />
          </WithConditionBadge>
        ),
      },
      PageHeader: {
        label: t('components.pageHeader.label'),
        permissions: { delete: false, duplicate: false, drag: false },
        fields: {
          content: { type: 'slot', visible: false, disallow: ZONE_DISALLOW, label: t('hierarchy.zones.content') },
          showIf: showIfPuckField,
          padding: { type: 'custom', render: () => <PaddingField /> },
          background: { type: 'text', label: t('components.pageHeader.backgroundColor') },
          borderColor: {
            type: 'custom',
            render: () => <BorderField translationPrefix="templates.editor.components.pageHeader" />,
          },
        },
        defaultProps: {
          content: [],
          displayName: '',
          background: '#ffffff',
          showIf: [],
          ...DEFAULT_PADDING,
          ...DEFAULT_BORDER,
        },
        render: (props: ComponentProps<typeof ZoneBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <ZoneBlock {...props} />
          </WithConditionBadge>
        ),
      },
      PageFooter: {
        label: t('components.pageFooter.label'),
        permissions: { delete: false, duplicate: false, drag: false },
        fields: {
          content: { type: 'slot', visible: false, disallow: ZONE_DISALLOW, label: t('hierarchy.zones.content') },
          showIf: showIfPuckField,
          padding: { type: 'custom', render: () => <PaddingField /> },
          background: { type: 'text', label: t('components.pageFooter.backgroundColor') },
          borderColor: {
            type: 'custom',
            render: () => <BorderField translationPrefix="templates.editor.components.pageFooter" />,
          },
        },
        defaultProps: {
          content: [],
          displayName: '',
          background: '#ffffff',
          showIf: [],
          ...DEFAULT_PADDING,
          ...DEFAULT_BORDER,
        },
        render: (props: ComponentProps<typeof ZoneBlock> & ShowIfProps) => (
          <WithConditionBadge showIf={props.showIf}>
            <ZoneBlock {...props} />
          </WithConditionBadge>
        ),
      },
    },
    root: isDocument
      ? {
          fields: {
            header: { type: 'slot', allow: ['PageHeader'], label: t('hierarchy.zones.header') },
            footer: { type: 'slot', allow: ['PageFooter'], label: t('hierarchy.zones.footer') },
          },
          defaultProps: {
            header: [{ type: 'PageHeader', props: getDefaultPageZoneProps('page-header') }],
            footer: [{ type: 'PageFooter', props: getDefaultPageZoneProps('page-footer') }],
          },
          render: ({
            header: Header,
            footer: Footer,
            children,
          }: {
            header: (props?: object) => ReactNode;
            footer: (props?: object) => ReactNode;
            children: ReactNode;
          }) => (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#ffffff' }}>
              <Header />
              <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
              <Footer />
            </div>
          ),
        }
      : {
          render: ({ children }: { children: ReactNode }) => (
            <div style={{ minHeight: 600, background: '#ffffff', padding: 40 }}>{children}</div>
          ),
        },
  } as unknown as TemplateConfig;
}
