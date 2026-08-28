/** biome-ignore-all lint/suspicious/noExplicitAny: needed */
import { type DesignComponent, getDocumentLayout, getEmailComponents } from '@/lib/templates/design-tree';
import { paddingPropsToCssString, resolvePaddingPx } from '@/lib/templates/padding-utils';
import { stripLoopScaffoldFromTiptapHtml } from '@/lib/templates/tiptap-merge-loop';

/**
 * Process tiptap HTML content: strip <p> wrappers, convert merge-tag spans
 * back to {{tag}} mustache syntax, and flatten redundant braces.
 */
const processTiptapContent = (html: string): string => {
  // TipTap usually returns HTML wrapped in <p> tags.
  const stripped = stripLoopScaffoldFromTiptapHtml(html.replace(/<p>/g, '').replace(/<\/p>/g, '<br />'));

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

const wrapWithLoop = (html: string, loopKey: string | undefined): string => {
  if (!loopKey) return html;
  return `{{#${loopKey}}}${html}{{/${loopKey}}}`;
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
/** Matches the Puck email root canvas (`puck-config` root render). */
const EMAIL_ROOT_PADDING_PX = 40;

/**
 * Wrap raw body HTML in a full HTML document with the Inter font loaded,
 * a light gray background, and a centered max-width container with top inset + shadow (document-like card).
 */
const EMAIL_CARD_SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)';

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
<body style="margin: 0; padding: 24px 16px 40px; background-color: #f4f4f5;">
  <div style="max-width: ${EMAIL_MAX_WIDTH}px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; box-shadow: ${EMAIL_CARD_SHADOW};">
    ${bodyHtml}
  </div>
</body>
</html>`;
};

type HtmlRenderOptions = {
  logoUrl?: string | null;
  wrapFlexChildren: boolean;
};

const renderTableHtml = (props: Record<string, any>): string => {
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
  const colgroup = `<colgroup>${columnWidths.map((width) => `<col style="width: ${width}%;" />`).join('')}</colgroup>`;

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

  const padCss = paddingPropsToCssString(props);
  return `<div style="width: 100%; box-sizing: border-box; padding: ${padCss}; margin: 0;"><table style="width: 100%; border-collapse: collapse; table-layout: fixed; box-sizing: border-box; margin: 0; padding: 0; ${buildTableOuterBorderCss(borderConfig)}">${colgroup}<thead>${headerRow}</thead><tbody>${isDynamic ? `{{#${loopKey}}}` : ''}${bodyRows}${isDynamic ? `{{/${loopKey}}}` : ''}</tbody></table></div>`;
};

const renderTextHtml = (props: Record<string, any>): string => {
  const finalContent = processTiptapContent(props.text || '');
  const textAlign = props.textAlign || 'left';
  return `<div style="font-family: ${EMAIL_FONT_FAMILY}; font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5; text-align: ${textAlign};">${finalContent}</div>`;
};

const renderButtonHtml = (props: Record<string, any>): string => {
  const btnUrl = props.useSystemUrl && props.systemUrlKey ? `{{system.${props.systemUrlKey}}}` : props.url || '#';
  return `<div style="margin: 10px 0;"><a href="${btnUrl}" style="font-family: ${EMAIL_FONT_FAMILY}; background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">${props.text || 'Button'}</a></div>`;
};

const renderImageHtml = (props: Record<string, any>, logoUrl?: string | null): string => {
  return `<img src="${resolveTemplateImageSrc({
    src: props.src,
    useLogoSource: props.useLogoSource,
    logoUrl,
  })}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;
};

const renderSlotHtml = (node: DesignComponent, options: HtmlRenderOptions): string => {
  const { type, props, children } = node;
  const layout = (props.layout as string) || 'vertical';
  const gap = Number(props.gap) || 0;
  const gridCols = Math.max(1, Number(props.gridColumns) || 2);
  const bgColor = (props.background as string) || 'transparent';
  const padCss = paddingPropsToCssString(props);
  const justify = (props.justifyContent as string) || 'flex-start';
  const align = (props.alignItems as string) || 'stretch';
  const borderCss = borderPropsToCss(props);
  const loopKey = type === 'Container' ? (props.loopKey as string) || '' : '';

  if (layout === 'horizontal') {
    const inner = options.wrapFlexChildren
      ? children
          .map(
            (child) =>
              `<div style="flex-grow: 1; flex-shrink: 1; flex-basis: 0; min-width: 0;">${renderComponentHtml(child, options)}</div>`,
          )
          .join('')
      : children.map((child) => renderComponentHtml(child, options)).join('');
    const flexStyle =
      `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${padCss}; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
    return wrapWithLoop(`<div style="${flexStyle}">${inner}</div>`, loopKey);
  }

  if (layout === 'grid') {
    if (options.wrapFlexChildren) {
      const basisPct = gridCols > 1 ? `calc((100% - ${(gridCols - 1) * gap}px) / ${gridCols})` : '100%';
      const inner = children
        .map(
          (child) =>
            `<div style="flex-grow: 0; flex-shrink: 0; flex-basis: ${basisPct}; min-width: 0;">${renderComponentHtml(child, options)}</div>`,
        )
        .join('');
      const flexStyle =
        `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; padding: ${padCss}; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
      return wrapWithLoop(`<div style="${flexStyle}">${inner}</div>`, loopKey);
    }
    const content = children.map((child) => renderComponentHtml(child, options)).join('');
    const divStyle = `padding: ${padCss}; background-color: ${bgColor}; ${borderCss}`.trim();
    return wrapWithLoop(
      `<div style="${divStyle}"><!--[if mso]><table style="width:100%;border-spacing:${gap}px;" cellpadding="0"><tr><![endif]--><div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: ${gap}px;">${content}</div><!--[if mso]></tr></table><![endif]--></div>`,
      loopKey,
    );
  }

  const content = children.map((child) => renderComponentHtml(child, options)).join('');
  const verticalStyle =
    `display: flex; flex-direction: column; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}; padding: ${padCss}; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
  return wrapWithLoop(`<div style="${verticalStyle}">${content}</div>`, loopKey);
};

const renderComponentHtml = (node: DesignComponent, options: HtmlRenderOptions): string => {
  const { type, props, children } = node;

  switch (type) {
    case 'Container':
    case 'Body':
    case 'PageHeader':
    case 'PageFooter':
      return renderSlotHtml(node, options);
    case 'Text':
      return renderTextHtml(props);
    case 'Button':
      return renderButtonHtml(props);
    case 'Image':
      return renderImageHtml(props, options.logoUrl);
    case 'Table':
      return renderTableHtml(props);
    default:
      return children.map((child) => renderComponentHtml(child, options)).join('');
  }
};

type BorderConfig = {
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderColor: string;
  borderStyle: string;
  borderWidth: number;
};

const borderConfigFromProps = (props: Record<string, unknown> | undefined): BorderConfig | null => {
  if (!props) return null;
  return {
    borderTop: props.borderTop === true,
    borderRight: props.borderRight === true,
    borderBottom: props.borderBottom === true,
    borderLeft: props.borderLeft === true,
    borderColor: (props.borderColor as string) ?? '#e4e4e7',
    borderStyle: (props.borderStyle as string) ?? 'solid',
    borderWidth: Number(props.borderWidth) || 1,
  };
};

export const generateEmailHtml = (
  design: unknown,
  options?: {
    logoUrl?: string | null;
  },
) => {
  const items = getEmailComponents(design);
  if (items.length === 0) return '';

  const content = items
    .map((item) => renderComponentHtml(item, { logoUrl: options?.logoUrl, wrapFlexChildren: false }))
    .join('');
  const bodyHtml = `<div style="padding: ${EMAIL_ROOT_PADDING_PX}px; background-color: #ffffff; width: 100%;">${content}</div>`;
  return wrapInDocument(bodyHtml);
};

/**
 * For document templates: extract header, body, and footer HTML from Puck Data
 * (`root.props.header` / `content` / `root.props.footer`). Craft JSON is converted first.
 */
export const generateDocumentParts = (
  design: unknown,
  options?: {
    logoUrl?: string | null;
  },
): {
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  headerPadding: number;
  footerPadding: number;
  headerBorder: BorderConfig | null;
  footerBorder: BorderConfig | null;
} => {
  const layout = getDocumentLayout(design);
  const renderOptions: HtmlRenderOptions = { logoUrl: options?.logoUrl, wrapFlexChildren: true };

  if (!layout.header && !layout.footer) {
    return {
      headerHtml: '',
      bodyHtml: generateEmailHtml(design, options),
      footerHtml: '',
      headerPadding: 0,
      footerPadding: 0,
      headerBorder: null,
      footerBorder: null,
    };
  }

  const headerHtml = layout.header ? renderComponentHtml(layout.header, renderOptions) : '';
  const footerHtml = layout.footer ? renderComponentHtml(layout.footer, renderOptions) : '';
  const headerPx = resolvePaddingPx(layout.header?.props ?? { padding: 16 });
  const footerPx = resolvePaddingPx(layout.footer?.props ?? { padding: 16 });
  const bodyHtml = layout.body.map((item) => renderComponentHtml(item, renderOptions)).join('');

  return {
    headerHtml,
    bodyHtml: wrapInDocument(bodyHtml),
    footerHtml,
    headerPadding: headerPx.top + headerPx.bottom,
    footerPadding: footerPx.top + footerPx.bottom,
    headerBorder: borderConfigFromProps(layout.header?.props),
    footerBorder: borderConfigFromProps(layout.footer?.props),
  };
};
