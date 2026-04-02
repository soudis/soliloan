/**
 * Process tiptap HTML content: strip <p> wrappers, convert merge-tag spans
 * back to {{tag}} mustache syntax, and flatten redundant braces.
 */
const processTiptapContent = (html: string): string => {
  // TipTap usually returns HTML wrapped in <p> tags.
  const stripped = html.replace(/<p>/g, '').replace(/<\/p>/g, '<br />');

  // Convert <span data-merge-tag="..."> back to {{tag}}.
  const withMergeTags = stripped.replace(
    /<span[^>]*data-merge-tag="([^"]*)"[^>]*>.*?<\/span>/g,
    (_match: string, tag: string) => {
      const rawTag = tag.replace(/[{}]/g, '');
      return `{{${rawTag}}}`;
    },
  );

  // Final flattening of any redundant braces just in case.
  return withMergeTags.replace(/\{\{+\s*([^}]*?)\s*\}+/g, '{{$1}}');
};

const EMAIL_FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type TableTextAlign = 'left' | 'center' | 'right' | 'justify';
type TableBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';
type TableCellStyle = {
  fontSize?: number;
  color?: string;
  textAlign?: TableTextAlign;
};

const DEFAULT_TABLE_HEADER_FONT_SIZE = 13;
const DEFAULT_TABLE_BODY_FONT_SIZE = 14;
const DEFAULT_TABLE_TEXT_COLOR = '#000000';

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
  borderWidth: Number(props.borderWidth) || 1,
});

const buildTableOuterBorderCss = (borderConfig: ReturnType<typeof getTableBorderConfig>): string => {
  const declarations: string[] = [];
  if (borderConfig.borderTop) {
    declarations.push(
      `border-top: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  if (borderConfig.borderRight) {
    declarations.push(
      `border-right: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  if (borderConfig.borderBottom) {
    declarations.push(
      `border-bottom: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  if (borderConfig.borderLeft) {
    declarations.push(
      `border-left: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  return declarations.join('; ');
};

const buildHtmlTableCellStyle = ({
  isHeader,
  style,
  width,
  showRightBorder,
  showBottomBorder,
  borderConfig,
}: {
  isHeader: boolean;
  style: Required<TableCellStyle>;
  width: number;
  showRightBorder: boolean;
  showBottomBorder: boolean;
  borderConfig: ReturnType<typeof getTableBorderConfig>;
}): string => {
  const declarations = [
    `font-family: ${EMAIL_FONT_FAMILY}`,
    `font-size: ${style.fontSize}px`,
    `color: ${style.color}`,
    `text-align: ${style.textAlign}`,
    `padding: 8px 12px`,
    `width: ${width}%`,
    'vertical-align: top',
  ];
  if (isHeader) {
    declarations.push('font-weight: 600', 'background-color: #fafafa');
  }
  if (showRightBorder) {
    declarations.push(
      `border-right: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  if (showBottomBorder) {
    declarations.push(
      `border-bottom: ${borderConfig.borderWidth}px ${borderConfig.borderStyle} ${borderConfig.borderColor}`,
    );
  }
  return declarations.join('; ');
};

/** Build inline CSS string for border from component props (for HTML output). */
const borderPropsToCss = (props: Record<string, unknown> | null | undefined): string => {
  if (!props || typeof props !== 'object') return '';
  const color = (props.borderColor as string) ?? '#e4e4e7';
  const style = (props.borderStyle as string) ?? 'solid';
  const width = Number(props.borderWidth) || 1;
  const parts: string[] = [];
  if (props.borderTop === true) parts.push(`border-top: ${width}px ${style} ${color}`);
  if (props.borderRight === true) parts.push(`border-right: ${width}px ${style} ${color}`);
  if (props.borderBottom === true) parts.push(`border-bottom: ${width}px ${style} ${color}`);
  if (props.borderLeft === true) parts.push(`border-left: ${width}px ${style} ${color}`);
  return parts.length ? `${parts.join('; ')};` : '';
};

/**
 * Resolve a potentially relative image src to an absolute URL so images
 * work in email clients outside the app.
 */
const resolveImageSrc = (src: string): string => {
  if (!src) return src;
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const baseUrl = (process.env.SOLILOAN_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return src;
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${baseUrl}${path}`;
};

const DEFAULT_APP_LOGO_SRC = '/soliloan-logo.webp';

const resolveTemplateImageSrc = ({
  src,
  useLogoSource,
  logoUrl,
}: {
  src?: string;
  useLogoSource?: boolean;
  logoUrl?: string | null;
}): string => {
  const rawSrc = useLogoSource ? logoUrl || DEFAULT_APP_LOGO_SRC : src || '';
  return resolveImageSrc(rawSrc);
};

const EMAIL_MAX_WIDTH = 600;

/**
 * Wrap raw body HTML in a full HTML document with the Inter font loaded,
 * a light gray background, and a centered max-width container.
 */
const wrapInDocument = (bodyHtml: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  body { margin: 0; padding: 0; font-family: ${EMAIL_FONT_FAMILY}; -webkit-font-smoothing: antialiased; background-color: #f4f4f5; }
  * { box-sizing: border-box; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: ${EMAIL_MAX_WIDTH}px; margin: 0 auto; background-color: #ffffff;">
    ${bodyHtml}
  </div>
</body>
</html>`;
};

export const generateEmailHtml = (
  nodes: Record<string, any>,
  options?: {
    logoUrl?: string | null;
  },
) => {
  const rootNode = nodes.ROOT;
  if (!rootNode) return '';

  const renderNode = (nodeId: string): string => {
    const node = nodes[nodeId];
    if (!node) return '';

    const { type, props, nodes: childNodes } = node;
    const componentName = typeof type === 'string' ? type : type.resolvedName || type.name;

    let content = '';
    if (childNodes && childNodes.length > 0) {
      content = childNodes.map((childId: string) => renderNode(childId)).join('');
    }

    switch (componentName) {
      case 'Container': {
        const layout = props.layout || 'vertical';
        const gap = props.gap || 0;
        const gridCols = props.gridColumns || 2;
        const bgColor = props.background || 'transparent';
        const pad = props.padding || 0;
        const justify = props.justifyContent || 'flex-start';
        const align = props.alignItems || 'stretch';
        const borderCss = borderPropsToCss(props);

        if (layout === 'horizontal') {
          const flexStyle =
            `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
          return `<div style="${flexStyle}">${content}</div>`;
        }
        if (layout === 'grid') {
          const divStyle = `padding: ${pad}px; background-color: ${bgColor}; ${borderCss}`.trim();
          return `<div style="${divStyle}"><!--[if mso]><table style="width:100%;border-spacing:${gap}px;" cellpadding="0"><tr><![endif]--><div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: ${gap}px;">${content}</div><!--[if mso]></tr></table><![endif]--></div>`;
        }
        const verticalStyle =
          `display: flex; flex-direction: column; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
        return `<div style="${verticalStyle}">${content}</div>`;
      }

      case 'Text': {
        const finalContent = processTiptapContent(props.text || '');
        const textAlign = props.textAlign || 'left';
        return `<div style="font-family: ${EMAIL_FONT_FAMILY}; font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5; text-align: ${textAlign};">${finalContent}</div>`;
      }

      case 'Button': {
        const btnUrl =
          props.useSystemUrl && props.systemUrlKey
            ? `{{system.${props.systemUrlKey}}}`
            : props.url || '#';
        return `
          <div style="margin: 10px 0;">
            <a href="${btnUrl}" style="font-family: ${EMAIL_FONT_FAMILY}; background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">
              ${props.text || 'Button'}
            </a>
          </div>
        `;
      }

      case 'Image':
        return `<img src="${resolveTemplateImageSrc({
          src: props.src,
          useLogoSource: props.useLogoSource,
          logoUrl: options?.logoUrl,
        })}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;

      case 'Table': {
        const cols = props.columns || 3;
        const headerTexts: string[] = props.headerTexts || [];
        const cellTexts: string[][] = props.cellTexts || [[]];
        const headerStyles: TableCellStyle[] = props.headerStyles || [];
        const cellStyles: TableCellStyle[][] = props.cellStyles || [];
        const loopKey = props.loopKey || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : props.rows || 1;
        const tableTextAlign = (props.textAlign as TableTextAlign) || 'left';
        const columnWidths = normalizeTableColumnWidths(props.columnWidths, cols);
        const borderConfig = getTableBorderConfig(props);
        const showVerticalGrid = borderConfig.borderLeft || borderConfig.borderRight;
        const showHorizontalGrid = borderConfig.borderTop || borderConfig.borderBottom;
        const colgroup = `<colgroup>${columnWidths
          .map((width) => `<col style="width: ${width}%;" />`)
          .join('')}</colgroup>`;

        let headerCells = '';
        for (let c = 0; c < cols; c++) {
          const cellContent = processTiptapContent(headerTexts[c] || '');
          const cellStyle = resolveTableCellStyle(headerStyles[c], true, tableTextAlign);
          headerCells += `<th style="${buildHtmlTableCellStyle({
            isHeader: true,
            style: cellStyle,
            width: columnWidths[c] ?? 100 / cols,
            showRightBorder: showVerticalGrid && c < cols - 1,
            showBottomBorder: showHorizontalGrid,
            borderConfig,
          })}">${cellContent}</th>`;
        }
        const headerRow = `<tr>${headerCells}</tr>`;

        let bodyRows = '';
        for (let r = 0; r < rowCount; r++) {
          let cells = '';
          for (let c = 0; c < cols; c++) {
            const cellContent = processTiptapContent(cellTexts[r]?.[c] || '');
            const cellStyle = resolveTableCellStyle(cellStyles[r]?.[c], false, tableTextAlign);
            cells += `<td style="${buildHtmlTableCellStyle({
              isHeader: false,
              style: cellStyle,
              width: columnWidths[c] ?? 100 / cols,
              showRightBorder: showVerticalGrid && c < cols - 1,
              showBottomBorder: showHorizontalGrid && (isDynamic || r < rowCount - 1),
              borderConfig,
            })}">${cellContent}</td>`;
          }
          bodyRows += `<tr>${cells}</tr>`;
        }

        const tableHtml = `<table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 16px 0; ${buildTableOuterBorderCss(borderConfig)}">${colgroup}<thead>${headerRow}</thead><tbody>${isDynamic ? `{{#${loopKey}}}` : ''}${bodyRows}${isDynamic ? `{{/${loopKey}}}` : ''}</tbody></table>`;
        return tableHtml;
      }

      case 'Loop':
        return `{{#${props.loopKey}}}${content}{{/${props.loopKey}}}`;

      case 'Canvas': // Root or sub-canvas
      case 'Element':
        return content;

      default:
        return content;
    }
  };

  const bodyHtml = renderNode('ROOT');
  return wrapInDocument(bodyHtml);
};

/**
 * Normalize Craft.js serialized output to a flat nodes map.
 * query.serialize() returns JSON that may be the raw SerializedNodes object
 * or (in some setups) a wrapper like { nodes: SerializedNodes }.
 */
export const getNodesMapFromSerialized = (serialized: string): Record<string, any> => {
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  return getNodesMapFromDesign(parsed);
};

/**
 * Normalize a design object (e.g. from initialDesign or JSON.parse) to a flat nodes map.
 */
export const getNodesMapFromDesign = (design: Record<string, unknown> | null | undefined): Record<string, any> => {
  if (!design || typeof design !== 'object') return {};
  if (design.nodes && typeof design.nodes === 'object' && !Array.isArray(design.nodes)) {
    return design.nodes as Record<string, any>;
  }
  return design as Record<string, any>;
};

/**
 * For document templates: extract the header, body, and footer HTML separately.
 * ROOT's children can be stored in two ways:
 * 1. linkedNodes: { PAGE_HEADER: nodeId, BODY: nodeId, PAGE_FOOTER: nodeId }
 * 2. nodes: [nodeId1, nodeId2, nodeId3] with each node having props.id = 'PAGE_HEADER' | 'BODY' | 'PAGE_FOOTER'
 * Your saved design uses (2) with props.id, so we resolve by matching props.id when linkedNodes is empty.
 */
export const generateDocumentParts = (
  nodes: Record<string, any>,
  options?: {
    logoUrl?: string | null;
  },
): {
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  headerPadding: number;
  footerPadding: number;
  headerBorder: {
    borderTop: boolean;
    borderRight: boolean;
    borderBottom: boolean;
    borderLeft: boolean;
    borderColor: string;
    borderStyle: string;
    borderWidth: number;
  } | null;
  footerBorder: {
    borderTop: boolean;
    borderRight: boolean;
    borderBottom: boolean;
    borderLeft: boolean;
    borderColor: string;
    borderStyle: string;
    borderWidth: number;
  } | null;
} => {
  const rootNode =
    nodes.ROOT ??
    Object.values(nodes).find(
      (n: any) => n?.linkedNodes?.PAGE_HEADER && n?.linkedNodes?.BODY && n?.linkedNodes?.PAGE_FOOTER,
    );
  if (!rootNode) {
    return {
      headerHtml: '',
      bodyHtml: '',
      footerHtml: '',
      headerPadding: 0,
      footerPadding: 0,
      headerBorder: null,
      footerBorder: null,
    };
  }

  const linked = rootNode.linkedNodes || {};
  const childIds: string[] = rootNode.nodes || [];
  let headerNodeId = linked.PAGE_HEADER;
  let bodyNodeId = linked.BODY;
  let footerNodeId = linked.PAGE_FOOTER;

  // When linkedNodes is empty (e.g. saved design from DB), resolve by props.id
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
      headerHtml: '',
      bodyHtml: generateEmailHtml(nodes, options),
      footerHtml: '',
      headerPadding: 0,
      footerPadding: 0,
      headerBorder: null,
      footerBorder: null,
    };
  }

  // Build a render function that processes a subtree
  const renderNode = (nodeId: string): string => {
    const node = nodes[nodeId];
    if (!node) return '';

    const { type, props, nodes: nodeChildren } = node;
    const componentName = typeof type === 'string' ? type : type.resolvedName || type.name;

    let content = '';
    if (nodeChildren && nodeChildren.length > 0) {
      content = nodeChildren.map((childId: string) => renderNode(childId)).join('');
    }

    // Reuse the same rendering logic as generateEmailHtml
    switch (componentName) {
      case 'Container':
      case 'PageHeader':
      case 'PageFooter': {
        const layout = props.layout || 'vertical';
        const gap = props.gap || 0;
        const gridCols = Math.max(1, props.gridColumns || 2);
        const bgColor = props.background || 'transparent';
        const pad = props.padding || 0;
        const justify = props.justifyContent || 'flex-start';
        const align = props.alignItems || 'stretch';
        const borderCss = borderPropsToCss(props);

        if (layout === 'horizontal') {
          const flexChildren = (nodeChildren || []).map(
            (childId: string) =>
              `<div style="flex-grow: 1; flex-shrink: 1; flex-basis: 0; min-width: 0;">${renderNode(childId)}</div>`,
          );
          const inner = flexChildren.join('');
          const flexStyle =
            `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
          return `<div style="${flexStyle}">${inner}</div>`;
        }
        if (layout === 'grid') {
          const gapPx = gap;
          const basisPct = gridCols > 1 ? `calc((100% - ${(gridCols - 1) * gapPx}px) / ${gridCols})` : '100%';
          const flexChildren = (nodeChildren || []).map(
            (childId: string) =>
              `<div style="flex-grow: 0; flex-shrink: 0; flex-basis: ${basisPct}; min-width: 0;">${renderNode(childId)}</div>`,
          );
          const inner = flexChildren.join('');
          const flexStyle =
            `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
          return `<div style="${flexStyle}">${inner}</div>`;
        }
        // vertical (default)
        const verticalStyle =
          `display: flex; flex-direction: column; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
        return `<div style="${verticalStyle}">${content}</div>`;
      }

      case 'Text': {
        const finalContent = processTiptapContent(props.text || '');
        const textAlign = props.textAlign || 'left';
        return `<div style="font-family: ${EMAIL_FONT_FAMILY}; font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5; text-align: ${textAlign};">${finalContent}</div>`;
      }

      case 'Button': {
        const docBtnUrl =
          props.useSystemUrl && props.systemUrlKey
            ? `{{system.${props.systemUrlKey}}}`
            : props.url || '#';
        return `<div style="margin: 10px 0;"><a href="${docBtnUrl}" style="font-family: ${EMAIL_FONT_FAMILY}; background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">${props.text || 'Button'}</a></div>`;
      }

      case 'Image':
        return `<img src="${resolveTemplateImageSrc({
          src: props.src,
          useLogoSource: props.useLogoSource,
          logoUrl: options?.logoUrl,
        })}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;

      case 'Table': {
        const cols = props.columns || 3;
        const headerTexts: string[] = props.headerTexts || [];
        const cellTexts: string[][] = props.cellTexts || [[]];
        const headerStyles: TableCellStyle[] = props.headerStyles || [];
        const cellStyles: TableCellStyle[][] = props.cellStyles || [];
        const loopKey = props.loopKey || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : props.rows || 1;
        const tableTextAlign = (props.textAlign as TableTextAlign) || 'left';
        const columnWidths = normalizeTableColumnWidths(props.columnWidths, cols);
        const borderConfig = getTableBorderConfig(props);
        const showVerticalGrid = borderConfig.borderLeft || borderConfig.borderRight;
        const showHorizontalGrid = borderConfig.borderTop || borderConfig.borderBottom;
        const colgroup = `<colgroup>${columnWidths
          .map((width) => `<col style="width: ${width}%;" />`)
          .join('')}</colgroup>`;

        let headerCells = '';
        for (let c = 0; c < cols; c++) {
          const cellContent = processTiptapContent(headerTexts[c] || '');
          const cellStyle = resolveTableCellStyle(headerStyles[c], true, tableTextAlign);
          headerCells += `<th style="${buildHtmlTableCellStyle({
            isHeader: true,
            style: cellStyle,
            width: columnWidths[c] ?? 100 / cols,
            showRightBorder: showVerticalGrid && c < cols - 1,
            showBottomBorder: showHorizontalGrid,
            borderConfig,
          })}">${cellContent}</th>`;
        }
        const headerRow = `<tr>${headerCells}</tr>`;

        let bodyRows = '';
        for (let r = 0; r < rowCount; r++) {
          let cells = '';
          for (let c = 0; c < cols; c++) {
            const cellContent = processTiptapContent(cellTexts[r]?.[c] || '');
            const cellStyle = resolveTableCellStyle(cellStyles[r]?.[c], false, tableTextAlign);
            cells += `<td style="${buildHtmlTableCellStyle({
              isHeader: false,
              style: cellStyle,
              width: columnWidths[c] ?? 100 / cols,
              showRightBorder: showVerticalGrid && c < cols - 1,
              showBottomBorder: showHorizontalGrid && (isDynamic || r < rowCount - 1),
              borderConfig,
            })}">${cellContent}</td>`;
          }
          bodyRows += `<tr>${cells}</tr>`;
        }

        return `<table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 16px 0; ${buildTableOuterBorderCss(borderConfig)}">${colgroup}<thead>${headerRow}</thead><tbody>${isDynamic ? `{{#${loopKey}}}` : ''}${bodyRows}${isDynamic ? `{{/${loopKey}}}` : ''}</tbody></table>`;
      }

      default:
        return content;
    }
  };

  const headerHtml = renderNode(headerNodeId);
  const footerHtml = renderNode(footerNodeId);

  // Extract padding from header/footer nodes (use resolved node IDs)
  const headerPadding = nodes[headerNodeId]?.props?.padding ?? 16;
  const footerPadding = nodes[footerNodeId]?.props?.padding ?? 16;

  // For the body, render the BODY node's children with the same layout as Container (horizontal/grid/vertical)
  const bodyNode = nodes[bodyNodeId];
  const bodyChildren = bodyNode?.nodes ?? [];
  const bodyLayout = bodyNode?.props?.layout || 'vertical';
  const bodyGap = bodyNode?.props?.gap ?? 0;
  const bodyGridCols = Math.max(1, bodyNode?.props?.gridColumns ?? 2);
  const bodyPadding = bodyNode?.props?.padding ?? 56;
  const bodyBg = bodyNode?.props?.background ?? '#ffffff';
  const bodyJustify = bodyNode?.props?.justifyContent ?? 'flex-start';
  const bodyAlign = bodyNode?.props?.alignItems ?? 'stretch';
  const bodyBorderCss = borderPropsToCss(bodyNode?.props ?? {});

  let bodyContentHtml: string;
  if (bodyChildren.length === 0) {
    bodyContentHtml = `<div style="padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}"></div>`;
  } else if (bodyLayout === 'horizontal') {
    const flexChildren = bodyChildren.map(
      (childId: string) =>
        `<div style="flex-grow: 1; flex-shrink: 1; flex-basis: 0; min-width: 0;">${renderNode(childId)}</div>`,
    );
    const flexStyle =
      `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${bodyGap}px; justify-content: ${bodyJustify}; align-items: ${bodyAlign}; padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}`.trim();
    bodyContentHtml = `<div style="${flexStyle}">${flexChildren.join('')}</div>`;
  } else if (bodyLayout === 'grid') {
    const gapPx = bodyGap;
    const basisPct = bodyGridCols > 1 ? `calc((100% - ${(bodyGridCols - 1) * gapPx}px) / ${bodyGridCols})` : '100%';
    const flexChildren = bodyChildren.map(
      (childId: string) =>
        `<div style="flex-grow: 0; flex-shrink: 0; flex-basis: ${basisPct}; min-width: 0;">${renderNode(childId)}</div>`,
    );
    const flexStyle =
      `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${bodyGap}px; padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}`.trim();
    bodyContentHtml = `<div style="${flexStyle}">${flexChildren.join('')}</div>`;
  } else {
    const bodyContent = bodyChildren.map((childId: string) => renderNode(childId)).join('');
    const verticalStyle =
      `display: flex; flex-direction: column; gap: ${bodyGap}px; justify-content: ${bodyJustify}; align-items: ${bodyAlign}; padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}`.trim();
    bodyContentHtml = `<div style="${verticalStyle}">${bodyContent}</div>`;
  }

  // Border config for PDF header/footer (native View styles, since we render them as Text/View not HTML)
  const headerBorder = nodes[headerNodeId]?.props
    ? {
        borderTop: nodes[headerNodeId].props.borderTop === true,
        borderRight: nodes[headerNodeId].props.borderRight === true,
        borderBottom: nodes[headerNodeId].props.borderBottom === true,
        borderLeft: nodes[headerNodeId].props.borderLeft === true,
        borderColor: nodes[headerNodeId].props.borderColor ?? '#e4e4e7',
        borderStyle: nodes[headerNodeId].props.borderStyle ?? 'solid',
        borderWidth: Number(nodes[headerNodeId].props.borderWidth) || 1,
      }
    : null;
  const footerBorder = nodes[footerNodeId]?.props
    ? {
        borderTop: nodes[footerNodeId].props.borderTop === true,
        borderRight: nodes[footerNodeId].props.borderRight === true,
        borderBottom: nodes[footerNodeId].props.borderBottom === true,
        borderLeft: nodes[footerNodeId].props.borderLeft === true,
        borderColor: nodes[footerNodeId].props.borderColor ?? '#e4e4e7',
        borderStyle: nodes[footerNodeId].props.borderStyle ?? 'solid',
        borderWidth: Number(nodes[footerNodeId].props.borderWidth) || 1,
      }
    : null;

  return {
    headerHtml,
    bodyHtml: wrapInDocument(bodyContentHtml),
    footerHtml,
    headerPadding,
    footerPadding,
    headerBorder,
    footerBorder,
  };
};
