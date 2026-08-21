/** biome-ignore-all lint/suspicious/noExplicitAny: needed */
const DEFAULT_APP_LOGO_SRC = '/soliloan-logo.webp';

function resolvePdfImageSrc(src: string, assetBaseUrl?: string): string {
  if (!src) return src;
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  if (!src.startsWith('/')) {
    return src;
  }

  const baseUrl = (assetBaseUrl || process.env.SOLILOAN_URL || process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}${src}` : src;
}

/**
 * Renders editor design JSON to @react-pdf/renderer components.
 * Used by the PDF API to generate documents from design + sample data
 * instead of pre-rendered HTML.
 */

import React from 'react';

import { type DesignComponent, designComponentId, getDocumentLayout } from '@/lib/templates/design-tree';
import { paddingPropsToPdfPoints, resolvePaddingPx } from '@/lib/templates/padding-utils';
import { type RasterSize, readRasterSizeFromDataUrl } from '@/lib/templates/raster-image-size';
import { processTemplate } from '@/lib/templates/template-processor';
import { stripLoopScaffoldFromTiptapHtml } from '@/lib/templates/tiptap-merge-loop';

// ─── Tiptap HTML → text for PDF (merge tags → {{x}}, then strip HTML) ─────
function processTiptapContent(html: string): string {
  const stripped = stripLoopScaffoldFromTiptapHtml((html || '').replace(/<p>/g, '').replace(/<\/p>/g, '<br />'));
  const withMergeTags = stripped.replace(
    /<span[^>]*data-merge-tag="([^"]*)"[^>]*>.*?<\/span>/g,
    (_: string, tag: string) => `{{${tag.replace(/[{}]/g, '')}}}`,
  );
  return withMergeTags.replace(/\{\{+\s*([^}]*?)\s*\}+/g, '{{$1}}');
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Inline style for a segment (react-pdf Text supports nested Text with fontWeight, fontStyle, textDecoration). */
type TextSegmentStyle = {
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  textDecoration?: 'underline';
};

type TextSegment = { text: string; style?: TextSegmentStyle };

/**
 * Parse simple HTML (strong, b, em, i, u, br) into segments for nested react-pdf Text.
 * React-pdf: "Text supports nesting of other Text or Link components to create inline styling."
 */
function htmlToTextSegments(html: string): TextSegment[] {
  const decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const parts = decoded.split(/(<strong>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<u>|<\/u>|<br\s*\/?>)/gi);
  const segments: TextSegment[] = [];
  let bold = false;
  let underline = false;
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') {
      bold = true;
      continue;
    }
    if (lower === '</strong>' || lower === '</b>') {
      bold = false;
      continue;
    }
    if (lower === '<em>' || lower === '<i>') {
      continue;
    }
    if (lower === '</em>' || lower === '</i>') {
      continue;
    }
    if (lower === '<u>') {
      underline = true;
      continue;
    }
    if (lower === '</u>') {
      underline = false;
      continue;
    }
    if (/^<br\s*\/?>$/i.test(part)) {
      segments.push({ text: '\n' });
      continue;
    }
    if (part.length === 0) continue;
    // Strip any remaining tags (e.g. span, p) so we don't show raw HTML
    const text = part.replace(/<[^>]+>/g, '');
    if (text.length === 0) continue;
    // Omit fontStyle: 'italic' — react-pdf crashes (DataView out-of-bounds) when embedding italic Inter.
    const style: TextSegmentStyle | undefined =
      bold || underline
        ? {
            ...(bold && { fontWeight: 'bold' as const }),
            ...(underline && { textDecoration: 'underline' as const }),
          }
        : undefined;
    segments.push(style ? { text, style } : { text });
  }
  return segments;
}

/**
 * Build children for a single react-pdf Text: plain strings and nested Text for styled segments.
 * Caller wraps with: <Text style={baseStyle}>{...renderTextSegments(...)}</Text>
 */
function renderTextSegments(
  segments: TextSegment[],
  baseStyle: Record<string, unknown>,
  PdfText: React.ComponentType<any>,
): React.ReactNode[] {
  if (segments.length === 0) return [];
  return segments.map((seg, i) =>
    seg.style ? React.createElement(PdfText, { key: i, style: { ...baseStyle, ...seg.style } }, seg.text) : seg.text,
  );
}

type TableTextAlign = 'left' | 'center' | 'right' | 'justify';
type TableBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';
type TableCellStyle = {
  fontSize?: number;
  color?: string;
  textAlign?: TableTextAlign;
};
type TemplateScope = Record<string, unknown>;

/** Resolve a loop key against scope (own or inherited from parent prototype). `createChildScope` puts parent data on the prototype, so `Object.hasOwn` would hide e.g. `loans` inside a per-loan iteration. */
const getScopeLoopArray = (scopeData: TemplateScope, loopKey: string): unknown => {
  if (scopeData == null || typeof scopeData !== 'object') return undefined;
  return loopKey in scopeData ? scopeData[loopKey] : undefined;
};

const createChildScope = (parentScope: TemplateScope, childScope: TemplateScope): TemplateScope =>
  Object.assign(Object.create(parentScope), childScope);

const DEFAULT_TABLE_HEADER_FONT_SIZE = 13;
const DEFAULT_TABLE_BODY_FONT_SIZE = 14;
const DEFAULT_TABLE_TEXT_COLOR = '#000000';
const CSS_PX_TO_PDF_PT = 72 / 96;
const pxToPdfPt = (px: number): number => px * CSS_PX_TO_PDF_PT;
const getPdfBorderWidth = (value: unknown): number => pxToPdfPt(Number(value) || 1);
const TABLE_CELL_PADDING_VERTICAL = pxToPdfPt(8);
const TABLE_CELL_PADDING_HORIZONTAL = pxToPdfPt(12);
const PDF_PAGE_WIDTH = 595;
const TEXT_LINE_HEIGHT_MULTIPLIER = 1.5;

const NON_LOOPABLE_CONTAINER_TYPES = new Set(['PageHeader', 'PageFooter', 'Body']);

/** Editor image `width` is CSS (px or %). React-pdf uses points; convert px so PDF matches the editor. */
function parseImageWidthToPt(value: unknown, relativeToPt: number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return pxToPdfPt(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(pct) ? (relativeToPt * pct) / 100 : null;
  }
  const numeric = Number.parseFloat(trimmed.replace(/px$/i, ''));
  return Number.isFinite(numeric) ? pxToPdfPt(numeric) : null;
}

function imageWidthToPdfStyle(widthProp: unknown): { width: number | string } {
  if (widthProp == null || widthProp === '') return { width: '100%' };
  if (typeof widthProp === 'number' && Number.isFinite(widthProp)) {
    return { width: pxToPdfPt(widthProp) };
  }
  if (typeof widthProp !== 'string') return { width: '100%' };
  const trimmed = widthProp.trim();
  if (!trimmed) return { width: '100%' };
  if (trimmed.endsWith('%')) return { width: trimmed };
  const numeric = Number.parseFloat(trimmed.replace(/px$/i, ''));
  if (!Number.isFinite(numeric)) return { width: '100%' };
  return { width: pxToPdfPt(numeric) };
}

/** Matches Container layout in the template editor — react-pdf (Yoga) supports the same flex keywords. */
function containerPdfFlexStyle(
  props: Record<string, unknown> | undefined,
  layout: 'vertical' | 'row',
): Record<string, unknown> {
  const justifyContent =
    (props?.justifyContent as 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | undefined) ??
    'flex-start';
  const alignItems = (props?.alignItems as 'flex-start' | 'flex-end' | 'center' | 'stretch' | undefined) ?? 'stretch';
  const gap = pxToPdfPt(Number(props?.gap) || 0);

  if (layout === 'vertical') {
    return {
      flexDirection: 'column',
      justifyContent,
      alignItems,
      gap,
    };
  }
  return {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent,
    alignItems,
    gap,
  };
}

/** Build react-pdf border style from component props */
function borderPropsToPdfStyle(props: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!props || typeof props !== 'object') return {};
  const w = getPdfBorderWidth(props.borderWidth);
  const color = (props.borderColor as string) ?? '#e4e4e7';
  const style = (props.borderStyle as string) ?? 'solid';
  const out: Record<string, unknown> = {};
  if (props.borderTop === true) {
    out.borderTopWidth = w;
    out.borderTopStyle = style;
    out.borderTopColor = color;
  }
  if (props.borderRight === true) {
    out.borderRightWidth = w;
    out.borderRightStyle = style;
    out.borderRightColor = color;
  }
  if (props.borderBottom === true) {
    out.borderBottomWidth = w;
    out.borderBottomStyle = style;
    out.borderBottomColor = color;
  }
  if (props.borderLeft === true) {
    out.borderLeftWidth = w;
    out.borderLeftStyle = style;
    out.borderLeftColor = color;
  }
  return out;
}

const normalizeTableColumnWidths = (columnWidths: unknown, columns: number): number[] => {
  if (columns <= 0) return [];
  const rawValues = Array.from({ length: columns }, (_, index) => {
    const value = Number((columnWidths as number[] | undefined)?.[index]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = rawValues.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Array.from({ length: columns }, () => 100 / columns);
  }
  return rawValues.map((value) => (value / total) * 100);
};

const resolveTableCellStyle = (
  style: TableCellStyle | undefined,
  isHeader: boolean,
  fallbackAlign: TableTextAlign,
): Required<TableCellStyle> => ({
  fontSize: style?.fontSize ?? (isHeader ? DEFAULT_TABLE_HEADER_FONT_SIZE : DEFAULT_TABLE_BODY_FONT_SIZE),
  color: style?.color ?? DEFAULT_TABLE_TEXT_COLOR,
  textAlign: style?.textAlign ?? fallbackAlign,
});

const getTableBorderConfig = (props: Record<string, any>) => ({
  borderTop: props.borderTop !== false,
  borderRight: props.borderRight !== false,
  borderBottom: props.borderBottom !== false,
  borderLeft: props.borderLeft !== false,
  borderColor: (props.borderColor as string) ?? '#e4e4e7',
  borderStyle: (props.borderStyle as TableBorderStyle) ?? 'solid',
  borderWidth: getPdfBorderWidth(props.borderWidth),
});

const getContainerLoopItems = (node: DesignComponent, scopeData: TemplateScope): TemplateScope[] | null => {
  if (NON_LOOPABLE_CONTAINER_TYPES.has(node.type) || node.type !== 'Container') return null;
  const loopKey = typeof node.props.loopKey === 'string' ? node.props.loopKey : '';
  if (!loopKey) return null;
  const rawValue = getScopeLoopArray(scopeData, loopKey);
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .filter((item): item is TemplateScope => typeof item === 'object' && item !== null)
    .map((item) => createChildScope(scopeData, item));
};

const buildTableOuterBorderPdfStyle = (
  borderConfig: ReturnType<typeof getTableBorderConfig>,
): Record<string, unknown> => {
  const style: Record<string, unknown> = {};
  if (borderConfig.borderTop) {
    style.borderTopWidth = borderConfig.borderWidth;
    style.borderTopStyle = borderConfig.borderStyle;
    style.borderTopColor = borderConfig.borderColor;
  }
  if (borderConfig.borderRight) {
    style.borderRightWidth = borderConfig.borderWidth;
    style.borderRightStyle = borderConfig.borderStyle;
    style.borderRightColor = borderConfig.borderColor;
  }
  if (borderConfig.borderBottom) {
    style.borderBottomWidth = borderConfig.borderWidth;
    style.borderBottomStyle = borderConfig.borderStyle;
    style.borderBottomColor = borderConfig.borderColor;
  }
  if (borderConfig.borderLeft) {
    style.borderLeftWidth = borderConfig.borderWidth;
    style.borderLeftStyle = borderConfig.borderStyle;
    style.borderLeftColor = borderConfig.borderColor;
  }
  return style;
};

const buildPdfTableCellViewStyle = ({
  width,
  showRightBorder,
  showBottomBorder,
  backgroundColor,
  borderConfig,
}: {
  width: number;
  showRightBorder: boolean;
  showBottomBorder: boolean;
  backgroundColor?: string;
  borderConfig: ReturnType<typeof getTableBorderConfig>;
}): Record<string, unknown> => {
  const style: Record<string, unknown> = {
    width: `${width}%`,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: `${width}%`,
    paddingVertical: TABLE_CELL_PADDING_VERTICAL,
    paddingHorizontal: TABLE_CELL_PADDING_HORIZONTAL,
  };
  if (backgroundColor) {
    style.backgroundColor = backgroundColor;
  }
  if (showRightBorder) {
    style.borderRightWidth = borderConfig.borderWidth;
    style.borderRightStyle = borderConfig.borderStyle;
    style.borderRightColor = borderConfig.borderColor;
  }
  if (showBottomBorder) {
    style.borderBottomWidth = borderConfig.borderWidth;
    style.borderBottomStyle = borderConfig.borderStyle;
    style.borderBottomColor = borderConfig.borderColor;
  }
  return style;
};

export type DesignToPdfOptions = {
  /** Design JSON (editor serialize output or stored design) */
  design: Record<string, unknown>;
  /** Sample/merge data for {{tags}} and {{#loop}} */
  sampleData?: Record<string, unknown>;
  /** Optional logo URL when image has useLogoSource (overrides project logo) */
  logoUrl?: string;
  /** Intrinsic pixel size of `logoUrl`, used so flex rows grow with the image. */
  logoDimensions?: RasterSize | null;
  /** Base URL for resolving public asset paths like /soliloan-logo.webp */
  assetBaseUrl?: string;
};

/** React-pdf components passed from the route (Document, Page, View, Text, Image) */
export type PdfComponents = {
  Document: React.ComponentType<any>;
  Page: React.ComponentType<any>;
  View: React.ComponentType<any>;
  Text: React.ComponentType<any>;
  Image: React.ComponentType<any>;
};

/**
 * Renders the Puck design tree (root header/footer slots + content) into react-pdf elements.
 * Returns { header, body, footer, headerPadding, footerPadding, headerBorder, footerBorder, headerHeight, footerHeight }
 * so the route can compose Page with fixed header/footer and padding.
 */
export function renderDesignToPdfParts(
  options: DesignToPdfOptions,
  components: PdfComponents,
): {
  header: React.ReactNode;
  body: React.ReactNode;
  footer: React.ReactNode;
  headerPadding: number;
  footerPadding: number;
  headerHeight: number;
  footerHeight: number;
  headerBorder: Record<string, unknown>;
  footerBorder: Record<string, unknown>;
} {
  const { design, sampleData = {}, logoUrl, logoDimensions, assetBaseUrl } = options;

  const resolveImageAspectRatio = (props: Record<string, unknown> | undefined, src: string): number => {
    const useLogo = props?.useLogoSource === true;
    const size = useLogo ? logoDimensions : readRasterSizeFromDataUrl(src);
    if (size && size.width > 0) return size.height / size.width;
    // Prefer a square box over cropping a taller logo when dimensions are unknown.
    return 1;
  };
  const { Document: _Doc, Page: _Page, View, Text: PdfText, Image: PdfImage } = components;
  const layout = getDocumentLayout(design);

  const emptyParts = {
    header: null,
    body: null,
    footer: null,
    headerPadding: 0,
    footerPadding: 0,
    headerHeight: 0,
    footerHeight: 0,
    headerBorder: {},
    footerBorder: {},
  };

  if (!layout.header && !layout.footer && layout.body.length === 0) {
    return emptyParts;
  }

  const data = sampleData as TemplateScope;
  const getVerticalBorderWidth = (props: Record<string, unknown> | null | undefined): number => {
    if (!props || typeof props !== 'object') return 0;
    const borderWidth = getPdfBorderWidth(props.borderWidth);
    return (props.borderTop === true ? borderWidth : 0) + (props.borderBottom === true ? borderWidth : 0);
  };

  const estimateTextHeight = (textHtml: string, fontSize: number, availableWidth: number): number => {
    const plainText = htmlToPlainText(textHtml);
    const lineHeight = fontSize * TEXT_LINE_HEIGHT_MULTIPLIER;
    const safeWidth = Math.max(availableWidth, fontSize * 4);
    const approxCharsPerLine = Math.max(1, Math.floor(safeWidth / (fontSize * 0.55)));
    const sourceLines = plainText.length > 0 ? plainText.split('\n') : [' '];
    const lineCount = sourceLines.reduce((sum, line) => {
      const chars = Math.max(line.trim().length, 1);
      return sum + Math.max(1, Math.ceil(chars / approxCharsPerLine));
    }, 0);
    return lineCount * lineHeight;
  };

  const getNodeInstanceCount = (node: DesignComponent, scopeData: TemplateScope): number => {
    if (node.type !== 'Container') return 1;
    const loopItems = getContainerLoopItems(node, scopeData);
    if (loopItems === null) return 1;
    return loopItems.length;
  };

  const estimateNodeHeights = (
    node: DesignComponent,
    availableWidth: number,
    context: { isHeaderOrFooter: boolean } = { isHeaderOrFooter: false },
    scopeData: TemplateScope = data,
  ): number[] => {
    if (node.type === 'Container') {
      const loopItems = getContainerLoopItems(node, scopeData);
      if (loopItems !== null) {
        return loopItems.map((item) => estimateNodeHeight(node, availableWidth, context, item, true));
      }
    }
    return [estimateNodeHeight(node, availableWidth, context, scopeData, false)];
  };

  const estimateNodeHeight = (
    node: DesignComponent,
    availableWidth: number,
    context: { isHeaderOrFooter: boolean } = { isHeaderOrFooter: false },
    scopeData: TemplateScope = data,
    skipLoopExpansion = false,
  ): number => {
    const { type: name, props, children } = node;

    if (!skipLoopExpansion && name === 'Container') {
      const loopItems = getContainerLoopItems(node, scopeData);
      if (loopItems !== null) {
        return loopItems.reduce((sum, item) => sum + estimateNodeHeight(node, availableWidth, context, item, true), 0);
      }
    }

    switch (name) {
      case 'Container':
      case 'Body':
      case 'PageHeader':
      case 'PageFooter': {
        const layout = (props?.layout as string) || 'vertical';
        const gap = pxToPdfPt(Number(props?.gap) || 0);
        const gridCols = Math.max(1, Number(props?.gridColumns) || 2);
        const sides = resolvePaddingPx(props);
        const padTop = pxToPdfPt(sides.top);
        const padBottom = pxToPdfPt(sides.bottom);
        const padLeft = pxToPdfPt(sides.left);
        const padRight = pxToPdfPt(sides.right);
        const borderHeight = getVerticalBorderWidth(props);
        const innerWidth = Math.max(availableWidth - padLeft - padRight, 80);

        if (children.length === 0) {
          return padTop + padBottom + borderHeight;
        }

        if (layout === 'horizontal') {
          const childCount = Math.max(
            1,
            children.reduce((sum, child) => sum + getNodeInstanceCount(child, scopeData), 0),
          );
          const childWidth = Math.max((innerWidth - gap * Math.max(childCount - 1, 0)) / childCount, 40);
          const childHeights = children.flatMap((child) => estimateNodeHeights(child, childWidth, context, scopeData));
          if (childHeights.length === 0) {
            return padTop + padBottom + borderHeight;
          }
          return padTop + padBottom + borderHeight + Math.max(...childHeights);
        }

        if (layout === 'grid') {
          const childWidth = Math.max((innerWidth - gap * Math.max(gridCols - 1, 0)) / gridCols, 40);
          const childHeights = children.flatMap((child) => estimateNodeHeights(child, childWidth, context, scopeData));
          if (childHeights.length === 0) {
            return padTop + padBottom + borderHeight;
          }
          let totalHeight = 0;
          for (let index = 0; index < childHeights.length; index += gridCols) {
            totalHeight += Math.max(...childHeights.slice(index, index + gridCols));
          }
          const rowCount = Math.ceil(childHeights.length / gridCols);
          return padTop + padBottom + borderHeight + totalHeight + gap * Math.max(rowCount - 1, 0);
        }

        const childHeights = children.flatMap((child) => estimateNodeHeights(child, innerWidth, context, scopeData));
        return (
          padTop +
          padBottom +
          borderHeight +
          childHeights.reduce((sum, height) => sum + height, 0) +
          gap * Math.max(childHeights.length - 1, 0)
        );
      }

      case 'Text': {
        const raw = processTiptapContent((props?.text as string) || '');
        const withData = processTemplate(raw, scopeData);
        const fontSize = pxToPdfPt(Number(props?.fontSize) || 16);
        return estimateTextHeight(withData, fontSize, availableWidth);
      }

      case 'Image': {
        const resolvedWidth =
          parseImageWidthToPt(props?.width, availableWidth) ?? Math.min(availableWidth, pxToPdfPt(180));
        const rawSrc = props?.useLogoSource === true ? logoUrl || DEFAULT_APP_LOGO_SRC : (props?.src as string) || '';
        const src = resolvePdfImageSrc(rawSrc, assetBaseUrl);
        const estimatedHeight = resolvedWidth * resolveImageAspectRatio(props, src);
        return estimatedHeight + pxToPdfPt(16);
      }

      case 'Table': {
        const cols = Math.max(1, Number(props?.columns) || 3);
        const headerTexts: string[] = (props?.headerTexts as string[]) || [];
        const cellTexts: string[][] = (props?.cellTexts as string[][]) || [[]];
        const headerStyles: TableCellStyle[] = (props?.headerStyles as TableCellStyle[]) || [];
        const cellStyles: TableCellStyle[][] = (props?.cellStyles as TableCellStyle[][]) || [];
        const loopKey = (props?.loopKey as string) || '';
        const isDynamic = loopKey.length > 0;
        const staticRows = Math.max(1, Number(props?.rows) || 1);
        const dynamicRows = isDynamic && Array.isArray(scopeData[loopKey]) ? scopeData[loopKey].length : 0;
        const templateRowCount = isDynamic ? 1 : staticRows;
        const renderedRowCount = isDynamic ? Math.max(dynamicRows, 1) : staticRows;
        const borderConfig = getTableBorderConfig(props ?? {});
        const columnWidths = normalizeTableColumnWidths(props?.columnWidths, cols);
        const horizontalBorderHeight =
          borderConfig.borderTop || borderConfig.borderBottom ? borderConfig.borderWidth : 0;

        const estimateTableRowHeight = (
          rowValues: string[],
          rowStyleResolver: (colIndex: number) => Required<TableCellStyle>,
          rowData: Record<string, any>,
        ): number => {
          const cellHeights = Array.from({ length: cols }, (_, colIndex) => {
            const cellStyle = rowStyleResolver(colIndex);
            const columnWidth = columnWidths[colIndex] ?? 100 / cols;
            const availableCellWidth = Math.max(
              (availableWidth * columnWidth) / 100 - TABLE_CELL_PADDING_HORIZONTAL * 2,
              40,
            );
            const raw = processTemplate(processTiptapContent(rowValues[colIndex] || ''), rowData);
            return estimateTextHeight(raw, pxToPdfPt(cellStyle.fontSize), availableCellWidth);
          });
          return (
            Math.max(...cellHeights, pxToPdfPt(DEFAULT_TABLE_BODY_FONT_SIZE)) +
            TABLE_CELL_PADDING_VERTICAL * 2 +
            horizontalBorderHeight
          );
        };

        const headerHeight = estimateTableRowHeight(
          headerTexts,
          (colIndex) =>
            resolveTableCellStyle(headerStyles[colIndex], true, (props?.textAlign as TableTextAlign) || 'left'),
          scopeData,
        );
        const bodyRowsHeight = Array.from({ length: templateRowCount }, (_, rowIndex) => {
          const loopArr = isDynamic ? getScopeLoopArray(scopeData, loopKey) : undefined;
          const rowData =
            isDynamic && Array.isArray(loopArr)
              ? createChildScope(scopeData, (loopArr[rowIndex] as TemplateScope | undefined) ?? {})
              : scopeData;
          return estimateTableRowHeight(
            cellTexts[rowIndex] || [],
            (colIndex) =>
              resolveTableCellStyle(
                isDynamic ? cellStyles[0]?.[colIndex] : cellStyles[rowIndex]?.[colIndex],
                false,
                (props?.textAlign as TableTextAlign) || 'left',
              ),
            rowData,
          );
        }).reduce((sum, height) => sum + height, 0);

        const outerBorderHeight =
          (borderConfig.borderTop ? borderConfig.borderWidth : 0) +
          (borderConfig.borderBottom ? borderConfig.borderWidth : 0);
        const padSides = resolvePaddingPx(props ?? {});
        const verticalPadding = pxToPdfPt(padSides.top) + pxToPdfPt(padSides.bottom);
        return (
          headerHeight +
          bodyRowsHeight * Math.max(1, renderedRowCount / templateRowCount) +
          outerBorderHeight +
          verticalPadding
        );
      }

      case 'Button':
        return 0;

      default:
        return children.reduce(
          (sum, child) =>
            sum +
            estimateNodeHeights(child, availableWidth, context, scopeData).reduce(
              (innerSum, height) => innerSum + height,
              0,
            ),
          0,
        );
    }
  };

  const renderNodeInstances = (
    node: DesignComponent,
    context: { isHeaderOrFooter: boolean } = { isHeaderOrFooter: false },
    scopeData: TemplateScope = data,
  ): React.ReactNode[] => {
    const nodeId = designComponentId(node);
    if (node.type === 'Container') {
      const loopItems = getContainerLoopItems(node, scopeData);
      if (loopItems !== null) {
        return loopItems.map((item, index) => renderNode(node, context, item, `${nodeId}-loop-${index}`, true));
      }
    }
    return [renderNode(node, context, scopeData, nodeId, false)];
  };

  const renderNode = (
    node: DesignComponent,
    context: { isHeaderOrFooter: boolean } = { isHeaderOrFooter: false },
    scopeData: TemplateScope = data,
    keyOverride?: string,
    skipLoopExpansion = false,
  ): React.ReactNode => {
    const nodeId = designComponentId(node);
    const { type: name, props, children: childNodes } = node;

    if (!skipLoopExpansion && name === 'Container') {
      const loopItems = getContainerLoopItems(node, scopeData);
      if (loopItems !== null) {
        return React.createElement(
          React.Fragment,
          { key: keyOverride ?? nodeId },
          ...loopItems.map((item, index) => renderNode(node, context, item, `${nodeId}-loop-${index}`, true)),
        );
      }
    }

    const children = childNodes.flatMap((child) => renderNodeInstances(child, context, scopeData));

    switch (name) {
      case 'Container':
      case 'Body':
      case 'PageHeader':
      case 'PageFooter': {
        const layout = (props?.layout as string) || 'vertical';
        const gridCols = Math.max(1, Number(props?.gridColumns) || 2);
        const bg = (props?.background as string) || 'transparent';
        const borderStyle = borderPropsToPdfStyle(props);

        const baseStyle: Record<string, unknown> = {
          ...paddingPropsToPdfPoints(props, pxToPdfPt),
          backgroundColor: bg,
          width: '100%',
          ...borderStyle,
        };

        if (layout === 'horizontal') {
          return React.createElement(
            View,
            {
              key: keyOverride ?? nodeId,
              style: {
                ...baseStyle,
                ...containerPdfFlexStyle(props, 'row'),
                overflow: 'visible',
              },
            },
            ...children.map((child, i) =>
              React.createElement(
                View,
                {
                  key: `${nodeId}-${i}`,
                  style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, overflow: 'visible' },
                },
                child,
              ),
            ),
          );
        }
        if (layout === 'grid') {
          const basisPct = gridCols > 1 ? `${100 / gridCols}%` : '100%';
          return React.createElement(
            View,
            {
              key: keyOverride ?? nodeId,
              style: {
                ...baseStyle,
                ...containerPdfFlexStyle(props, 'row'),
              },
            },
            ...children.map((child, i) =>
              React.createElement(
                View,
                {
                  key: `${nodeId}-${i}`,
                  style: { flexGrow: 0, flexShrink: 0, flexBasis: basisPct, minWidth: 0 },
                },
                child,
              ),
            ),
          );
        }
        return React.createElement(
          View,
          {
            key: keyOverride ?? nodeId,
            style: {
              ...baseStyle,
              ...containerPdfFlexStyle(props, 'vertical'),
            },
          },
          ...children,
        );
      }

      case 'Text': {
        const raw = processTiptapContent((props?.text as string) || '');
        const withData = processTemplate(raw, scopeData);
        const fontSize = pxToPdfPt(Number(props?.fontSize) || 16);
        const color = (props?.color as string) || '#000000';
        const textAlign = (props?.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left';
        const hasPagePlaceholder =
          context.isHeaderOrFooter && (withData.includes('{{pageNumber}}') || withData.includes('{{totalPages}}'));
        const style = { fontSize, color, textAlign, fontFamily: 'Inter' as const };

        if (hasPagePlaceholder) {
          return React.createElement(PdfText, {
            key: keyOverride ?? nodeId,
            style,
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => {
              const withNumbers = withData
                .replace(/\{\{pageNumber\}\}/g, String(pageNumber))
                .replace(/\{\{totalPages\}\}/g, String(totalPages));
              const segments = htmlToTextSegments(withNumbers);
              if (segments.length === 0) return null;
              return React.createElement(PdfText, { style }, ...renderTextSegments(segments, style, PdfText));
            },
          });
        }
        const segments = htmlToTextSegments(withData);
        if (segments.length === 0) return null;
        return React.createElement(
          PdfText,
          { key: keyOverride ?? nodeId, style },
          ...renderTextSegments(segments, style, PdfText),
        );
      }

      case 'Image': {
        const useLogo = props?.useLogoSource === true;
        const rawSrc = useLogo ? logoUrl || DEFAULT_APP_LOGO_SRC : (props?.src as string) || '';
        const src = resolvePdfImageSrc(rawSrc, assetBaseUrl);
        if (!src) return null;
        const widthStyle = imageWidthToPdfStyle(props?.width ?? '100%');
        const aspect = resolveImageAspectRatio(props, src);
        const absoluteWidthPt = parseImageWidthToPt(props?.width, PDF_PAGE_WIDTH);
        const imageStyle: Record<string, unknown> = {
          ...widthStyle,
          maxWidth: '100%',
          marginVertical: pxToPdfPt(8),
          flexShrink: 0,
          objectFit: 'contain',
        };
        // Yoga does not pick up intrinsic image height in a row; set it so the
        // parent grows instead of clipping the logo to the sibling text height.
        if (typeof widthStyle.width === 'number') {
          imageStyle.height = widthStyle.width * aspect;
        } else if (absoluteWidthPt != null && !(typeof props?.width === 'string' && props.width.trim().endsWith('%'))) {
          imageStyle.height = absoluteWidthPt * aspect;
        }
        return React.createElement(PdfImage, {
          key: keyOverride ?? nodeId,
          src,
          style: imageStyle,
        });
      }

      case 'Table': {
        const cols = Math.max(1, Number(props?.columns) || 3);
        const headerTexts: string[] = (props?.headerTexts as string[]) || [];
        const cellTexts: string[][] = (props?.cellTexts as string[][]) || [[]];
        const headerStyles: TableCellStyle[] = (props?.headerStyles as TableCellStyle[]) || [];
        const cellStyles: TableCellStyle[][] = (props?.cellStyles as TableCellStyle[][]) || [];
        const loopKey = (props?.loopKey as string) || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : Math.max(1, Number(props?.rows) || 1);
        const textAlign = (props?.textAlign as TableTextAlign) || 'left';
        const borderConfig = getTableBorderConfig(props ?? {});
        const columnWidths = normalizeTableColumnWidths(props?.columnWidths, cols);
        const showVerticalGrid = borderConfig.borderLeft || borderConfig.borderRight;
        const showHorizontalGrid = borderConfig.borderTop || borderConfig.borderBottom;
        const rows: React.ReactNode[] = [];
        // Header row
        const headerCells = Array.from({ length: cols }, (_, c) => {
          const withData = processTemplate(processTiptapContent(headerTexts[c] || ''), scopeData);
          const segments = htmlToTextSegments(withData);
          const cellStyle = resolveTableCellStyle(headerStyles[c], true, textAlign);
          const textStyle = {
            fontSize: pxToPdfPt(cellStyle.fontSize),
            color: cellStyle.color,
            textAlign: cellStyle.textAlign,
            fontFamily: 'Inter' as const,
          };
          const headerStyle = { ...textStyle, fontWeight: 600 as const };
          return React.createElement(
            View,
            {
              key: `h-${c}`,
              style: buildPdfTableCellViewStyle({
                width: columnWidths[c] ?? 100 / cols,
                showRightBorder: showVerticalGrid && c < cols - 1,
                showBottomBorder: showHorizontalGrid,
                backgroundColor: '#fafafa',
                borderConfig,
              }),
            },
            React.createElement(PdfText, { style: headerStyle }, ...renderTextSegments(segments, headerStyle, PdfText)),
          );
        });
        rows.push(React.createElement(View, { key: 'header-row', style: { flexDirection: 'row' } }, ...headerCells));

        if (isDynamic && Array.isArray(getScopeLoopArray(scopeData, loopKey))) {
          const items = getScopeLoopArray(scopeData, loopKey) as TemplateScope[];
          items.forEach((item, r) => {
            const rowScope = createChildScope(scopeData, item);
            const cells = Array.from({ length: cols }, (_, c) => {
              const cellHtml = (cellTexts[0]?.[c] as string) || '';
              const withData = processTemplate(processTiptapContent(cellHtml), rowScope);
              const segments = htmlToTextSegments(withData);
              const cellStyle = resolveTableCellStyle(cellStyles[0]?.[c], false, textAlign);
              const textStyle = {
                fontSize: pxToPdfPt(cellStyle.fontSize),
                color: cellStyle.color,
                textAlign: cellStyle.textAlign,
                fontFamily: 'Inter' as const,
              };
              return React.createElement(
                View,
                {
                  key: `c-${r}-${c}`,
                  style: buildPdfTableCellViewStyle({
                    width: columnWidths[c] ?? 100 / cols,
                    showRightBorder: showVerticalGrid && c < cols - 1,
                    showBottomBorder: showHorizontalGrid && r < items.length - 1,
                    borderConfig,
                  }),
                },
                React.createElement(PdfText, { style: textStyle }, ...renderTextSegments(segments, textStyle, PdfText)),
              );
            });
            rows.push(React.createElement(View, { key: `row-${r}`, style: { flexDirection: 'row' } }, ...cells));
          });
        } else {
          for (let r = 0; r < rowCount; r++) {
            const cells = Array.from({ length: cols }, (_, c) => {
              const withScopedData = processTemplate(processTiptapContent(cellTexts[r]?.[c] || ''), scopeData);
              const segments = htmlToTextSegments(withScopedData);
              const cellStyle = resolveTableCellStyle(cellStyles[r]?.[c], false, textAlign);
              const textStyle = {
                fontSize: pxToPdfPt(cellStyle.fontSize),
                color: cellStyle.color,
                textAlign: cellStyle.textAlign,
                fontFamily: 'Inter' as const,
              };
              return React.createElement(
                View,
                {
                  key: `c-${r}-${c}`,
                  style: buildPdfTableCellViewStyle({
                    width: columnWidths[c] ?? 100 / cols,
                    showRightBorder: showVerticalGrid && c < cols - 1,
                    showBottomBorder: showHorizontalGrid && r < rowCount - 1,
                    borderConfig,
                  }),
                },
                React.createElement(PdfText, { style: textStyle }, ...renderTextSegments(segments, textStyle, PdfText)),
              );
            });
            rows.push(React.createElement(View, { key: `row-${r}`, style: { flexDirection: 'row' } }, ...cells));
          }
        }

        return React.createElement(
          View,
          {
            key: keyOverride ?? nodeId,
            style: {
              width: '100%',
              ...paddingPropsToPdfPoints(props ?? {}, pxToPdfPt),
            },
          },
          React.createElement(
            View,
            {
              style: {
                width: '100%',
                ...buildTableOuterBorderPdfStyle(borderConfig),
              },
            },
            ...rows,
          ),
        );
      }

      case 'Button':
        return null;

      case 'Canvas':
      case 'Element':
        return React.createElement(React.Fragment, { key: keyOverride ?? nodeId }, ...children);

      default:
        return React.createElement(React.Fragment, { key: keyOverride ?? nodeId }, ...children);
    }
  };

  const headerSides = resolvePaddingPx(layout.header?.props ?? { padding: 16 });
  const footerSides = resolvePaddingPx(layout.footer?.props ?? { padding: 16 });
  const headerPadding = pxToPdfPt(headerSides.top) + pxToPdfPt(headerSides.bottom);
  const footerPadding = pxToPdfPt(footerSides.top) + pxToPdfPt(footerSides.bottom);
  const headerHeight = layout.header
    ? Math.max(
        headerPadding + pxToPdfPt(16),
        estimateNodeHeight(layout.header, PDF_PAGE_WIDTH, { isHeaderOrFooter: true }),
      )
    : 0;
  const footerHeight = layout.footer
    ? Math.max(
        footerPadding + pxToPdfPt(16),
        estimateNodeHeight(layout.footer, PDF_PAGE_WIDTH, { isHeaderOrFooter: true }),
      )
    : 0;
  const headerBorder = borderPropsToPdfStyle(layout.header?.props);
  const footerBorder = borderPropsToPdfStyle(layout.footer?.props);

  const header = layout.header ? renderNode(layout.header, { isHeaderOrFooter: true }) : null;
  const footer = layout.footer ? renderNode(layout.footer, { isHeaderOrFooter: true }) : null;

  let bodyContent: React.ReactNode = null;
  if (layout.body.length === 1) {
    bodyContent = renderNode(layout.body[0]);
  } else if (layout.body.length > 1) {
    bodyContent = React.createElement(
      View,
      { style: { width: '100%', flexDirection: 'column' } },
      ...layout.body.flatMap((item) => renderNodeInstances(item)),
    );
  }

  return {
    header,
    body: bodyContent,
    footer,
    headerPadding,
    footerPadding,
    headerHeight,
    footerHeight,
    headerBorder,
    footerBorder,
  };
}
