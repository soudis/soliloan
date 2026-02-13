/**
 * Renders editor design JSON to @react-pdf/renderer components.
 * Used by the PDF API to generate documents from design + sample data
 * instead of pre-rendered HTML.
 */

import React from 'react';

import { getNodesMapFromDesign } from '@/lib/templates/email-generator';
import { processTemplate } from '@/lib/templates/template-processor';

// ─── Tiptap HTML → text for PDF (merge tags → {{x}}, then strip HTML) ─────
function processTiptapContent(html: string): string {
  const stripped = (html || '').replace(/<p>/g, '').replace(/<\/p>/g, '<br />');
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
  let italic = false;
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
      italic = true;
      continue;
    }
    if (lower === '</em>' || lower === '</i>') {
      italic = false;
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
  if (segments.length === 0) return [' '];
  return segments.map((seg, i) =>
    seg.style ? React.createElement(PdfText, { key: i, style: { ...baseStyle, ...seg.style } }, seg.text) : seg.text,
  );
}

const TABLE_CELL_VIEW_STYLE = { padding: 8, borderWidth: 1, borderColor: '#e4e4e7', flex: 1 as const };
const TABLE_HEADER_VIEW_STYLE = { ...TABLE_CELL_VIEW_STYLE, backgroundColor: '#fafafa' };
const TABLE_TEXT_STYLE = { fontSize: 12, fontFamily: 'Inter' as const };

/** Build react-pdf border style from component props */
function borderPropsToPdfStyle(props: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!props || typeof props !== 'object') return {};
  const w = Number(props.borderWidth) || 1;
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

export type DesignToPdfOptions = {
  /** Design JSON (editor serialize output or stored design) */
  design: Record<string, unknown>;
  /** Sample/merge data for {{tags}} and {{#loop}} */
  sampleData?: Record<string, unknown>;
  /** Optional logo URL when image has useLogoSource (overrides project logo) */
  logoUrl?: string;
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
 * Renders the design tree (ROOT → PAGE_HEADER, BODY, PAGE_FOOTER) into react-pdf elements.
 * Returns { header, body, footer, headerPadding, footerPadding, headerBorder, footerBorder }
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
  headerBorder: Record<string, unknown>;
  footerBorder: Record<string, unknown>;
} {
  const { design, sampleData = {}, logoUrl } = options;
  const nodes = getNodesMapFromDesign(design);
  const { Document: _Doc, Page: _Page, View, Text: PdfText, Image: PdfImage } = components;

  const rootNode =
    nodes.ROOT ??
    Object.values(nodes).find(
      (n: any) => n?.linkedNodes?.PAGE_HEADER && n?.linkedNodes?.BODY && n?.linkedNodes?.PAGE_FOOTER,
    );
  if (!rootNode) {
    return {
      header: null,
      body: null,
      footer: null,
      headerPadding: 0,
      footerPadding: 0,
      headerBorder: {},
      footerBorder: {},
    };
  }

  const linked = rootNode.linkedNodes || {};
  const childIds: string[] = rootNode.nodes || [];
  let headerNodeId = linked.PAGE_HEADER;
  let bodyNodeId = linked.BODY;
  let footerNodeId = linked.PAGE_FOOTER;
  if (!headerNodeId || !bodyNodeId || !footerNodeId) {
    for (const id of childIds) {
      const n = nodes[id];
      const propId = n?.props?.id;
      if (propId === 'PAGE_HEADER') headerNodeId = id;
      if (propId === 'BODY') bodyNodeId = id;
      if (propId === 'PAGE_FOOTER') footerNodeId = id;
    }
  }

  const hasDocumentStructure = headerNodeId && bodyNodeId && footerNodeId;
  if (!hasDocumentStructure) {
    return {
      header: null,
      body: null,
      footer: null,
      headerPadding: 0,
      footerPadding: 0,
      headerBorder: {},
      footerBorder: {},
    };
  }

  const data = sampleData as Record<string, any>;

  const renderNode = (
    nodeId: string,
    context: { isHeaderOrFooter: boolean } = { isHeaderOrFooter: false },
  ): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;

    const { type, props, nodes: nodeChildren } = node;
    const name = typeof type === 'string' ? type : ((type as any)?.resolvedName ?? (type as any)?.name);
    const childIdsList: string[] = nodeChildren || [];

    const children = childIdsList.map((cid) => renderNode(cid, context));

    switch (name) {
      case 'Container':
      case 'PageHeader':
      case 'PageFooter': {
        const layout = (props?.layout as string) || 'vertical';
        const gap = Number(props?.gap) || 0;
        const gridCols = Math.max(1, Number(props?.gridColumns) || 2);
        const bg = (props?.background as string) || 'transparent';
        const pad = Number(props?.padding) || 0;
        const borderStyle = borderPropsToPdfStyle(props);

        const baseStyle: Record<string, unknown> = {
          padding: pad,
          backgroundColor: bg,
          width: '100%',
          ...borderStyle,
        };

        if (layout === 'horizontal') {
          return React.createElement(
            View,
            {
              key: nodeId,
              style: {
                ...baseStyle,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap,
              },
            },
            ...children.map((child, i) =>
              React.createElement(
                View,
                {
                  key: `${nodeId}-${i}`,
                  style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
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
              key: nodeId,
              style: {
                ...baseStyle,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap,
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
            key: nodeId,
            style: baseStyle,
          },
          ...children,
        );
      }

      case 'Text': {
        const raw = processTiptapContent((props?.text as string) || '');
        const withData = processTemplate(raw, data);
        const fontSize = Number(props?.fontSize) || 16;
        const color = (props?.color as string) || '#000000';
        const textAlign = (props?.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left';
        const hasPagePlaceholder =
          context.isHeaderOrFooter && (withData.includes('{{pageNumber}}') || withData.includes('{{totalPages}}'));
        const style = { fontSize, color, textAlign, fontFamily: 'Inter' as const };

        if (hasPagePlaceholder) {
          return React.createElement(PdfText, {
            key: nodeId,
            style,
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => {
              const withNumbers = withData
                .replace(/\{\{pageNumber\}\}/g, String(pageNumber))
                .replace(/\{\{totalPages\}\}/g, String(totalPages));
              const segments = htmlToTextSegments(withNumbers);
              return React.createElement(PdfText, { style }, ...renderTextSegments(segments, style, PdfText));
            },
          });
        }
        const segments = htmlToTextSegments(withData);
        return React.createElement(PdfText, { key: nodeId, style }, ...renderTextSegments(segments, style, PdfText));
      }

      case 'Image': {
        const useLogo = props?.useLogoSource === true;
        const src = useLogo && logoUrl ? logoUrl : (props?.src as string) || '';
        const width = (props?.width as string) || '100%';
        if (!src) return null;
        return React.createElement(PdfImage, {
          key: nodeId,
          src,
          style: { width, maxWidth: '100%', marginVertical: 8 },
        });
      }

      case 'Table': {
        const cols = Math.max(1, Number(props?.columns) || 3);
        const headerTexts: string[] = (props?.headerTexts as string[]) || [];
        const cellTexts: string[][] = (props?.cellTexts as string[][]) || [[]];
        const loopKey = (props?.loopKey as string) || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : Math.max(1, Number(props?.rows) || 1);
        const textAlign = (props?.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left';
        const textStyle = { ...TABLE_TEXT_STYLE, textAlign };

        const headerStyle = { ...textStyle, fontWeight: 600 };
        const rows: React.ReactNode[] = [];
        // Header row
        const headerCells = Array.from({ length: cols }, (_, c) => {
          const withData = processTemplate(processTiptapContent(headerTexts[c] || ''), data);
          const segments = htmlToTextSegments(withData);
          return React.createElement(
            View,
            { key: `h-${c}`, style: TABLE_HEADER_VIEW_STYLE },
            React.createElement(PdfText, { style: headerStyle }, ...renderTextSegments(segments, headerStyle, PdfText)),
          );
        });
        rows.push(React.createElement(View, { key: 'header-row', style: { flexDirection: 'row' } }, ...headerCells));

        if (isDynamic && Array.isArray(data[loopKey])) {
          const items = data[loopKey] as Record<string, any>[];
          items.forEach((item, r) => {
            const cells = Array.from({ length: cols }, (_, c) => {
              const cellHtml = (cellTexts[0]?.[c] as string) || '';
              const withData = processTemplate(processTiptapContent(cellHtml), item);
              const segments = htmlToTextSegments(withData);
              return React.createElement(
                View,
                { key: `c-${r}-${c}`, style: TABLE_CELL_VIEW_STYLE },
                React.createElement(PdfText, { style: textStyle }, ...renderTextSegments(segments, textStyle, PdfText)),
              );
            });
            rows.push(React.createElement(View, { key: `row-${r}`, style: { flexDirection: 'row' } }, ...cells));
          });
        } else {
          for (let r = 0; r < rowCount; r++) {
            const cells = Array.from({ length: cols }, (_, c) => {
              const withData = processTemplate(processTiptapContent(cellTexts[r]?.[c] || ''), data);
              const segments = htmlToTextSegments(withData);
              return React.createElement(
                View,
                { key: `c-${r}-${c}`, style: TABLE_CELL_VIEW_STYLE },
                React.createElement(PdfText, { style: textStyle }, ...renderTextSegments(segments, textStyle, PdfText)),
              );
            });
            rows.push(React.createElement(View, { key: `row-${r}`, style: { flexDirection: 'row' } }, ...cells));
          }
        }

        return React.createElement(View, { key: nodeId, style: { width: '100%', marginVertical: 16 } }, ...rows);
      }

      case 'Button':
        return null;

      case 'Canvas':
      case 'Element':
        return React.createElement(React.Fragment, { key: nodeId }, ...children);

      default:
        return React.createElement(React.Fragment, { key: nodeId }, ...children);
    }
  };

  const headerPadding = Number(nodes[headerNodeId]?.props?.padding) ?? 16;
  const footerPadding = Number(nodes[footerNodeId]?.props?.padding) ?? 16;
  const headerBorder = borderPropsToPdfStyle(nodes[headerNodeId]?.props);
  const footerBorder = borderPropsToPdfStyle(nodes[footerNodeId]?.props);

  const header = renderNode(headerNodeId, { isHeaderOrFooter: true });
  const footer = renderNode(footerNodeId, { isHeaderOrFooter: true });
  const bodyNode = nodes[bodyNodeId];
  const bodyChildIds: string[] = bodyNode?.nodes || [];
  const bodyLayout = bodyNode?.props?.layout || 'vertical';
  const bodyGap = Number(bodyNode?.props?.gap) ?? 0;
  const bodyGridCols = Math.max(1, Number(bodyNode?.props?.gridColumns) ?? 2);
  const bodyPad = Number(bodyNode?.props?.padding) ?? 56;
  const bodyBg = (bodyNode?.props?.background as string) ?? '#ffffff';
  const bodyBorderStyle = borderPropsToPdfStyle(bodyNode?.props);

  let bodyContent: React.ReactNode;
  if (bodyChildIds.length === 0) {
    bodyContent = null;
  } else {
    const bodyChildren = bodyChildIds.map((id) => renderNode(id));
    if (bodyLayout === 'horizontal') {
      bodyContent = React.createElement(
        View,
        {
          style: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: bodyGap,
            padding: bodyPad,
            backgroundColor: bodyBg,
            width: '100%',
            ...bodyBorderStyle,
          },
        },
        ...bodyChildren.map((child, i) =>
          React.createElement(
            View,
            { key: i, style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 } },
            child,
          ),
        ),
      );
    } else if (bodyLayout === 'grid') {
      const basisPct = bodyGridCols > 1 ? `${100 / bodyGridCols}%` : '100%';
      bodyContent = React.createElement(
        View,
        {
          style: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: bodyGap,
            padding: bodyPad,
            backgroundColor: bodyBg,
            width: '100%',
            ...bodyBorderStyle,
          },
        },
        ...bodyChildren.map((child, i) =>
          React.createElement(
            View,
            { key: i, style: { flexGrow: 0, flexShrink: 0, flexBasis: basisPct, minWidth: 0 } },
            child,
          ),
        ),
      );
    } else {
      bodyContent = React.createElement(
        View,
        {
          style: {
            padding: bodyPad,
            backgroundColor: bodyBg,
            width: '100%',
            ...bodyBorderStyle,
          },
        },
        ...bodyChildren,
      );
    }
  }

  return {
    header,
    body: bodyContent,
    footer,
    headerPadding,
    footerPadding,
    headerBorder,
    footerBorder,
  };
}
