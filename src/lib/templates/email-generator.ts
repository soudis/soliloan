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
  return parts.length ? parts.join('; ') + ';' : '';
};

/**
 * Wrap raw body HTML in a full HTML document with the Inter font loaded,
 * matching the editor's appearance.
 */
const wrapInDocument = (bodyHtml: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  body { margin: 0; padding: 0; font-family: ${EMAIL_FONT_FAMILY}; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
};

export const generateEmailHtml = (nodes: Record<string, any>) => {
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
        const borderCss = borderPropsToCss(props);

        // For email compatibility: vertical uses simple block, horizontal uses table cells,
        // grid uses a table-based N-column layout
        if (layout === 'horizontal') {
          const tableStyle =
            `width: 100%; padding: ${pad}px; background-color: ${bgColor}; border-spacing: ${gap}px; ${borderCss}`.trim();
          return `<table style="${tableStyle}" cellpadding="0" cellspacing="${gap}"><tr><td style="vertical-align: top;">${content.replace(/<\/div>\s*<div/g, `</div></td><td style="vertical-align: top;"><div`)}</td></tr></table>`;
        }
        if (layout === 'grid') {
          const divStyle = `padding: ${pad}px; background-color: ${bgColor}; ${borderCss}`.trim();
          return `<div style="${divStyle}"><!--[if mso]><table style="width:100%;border-spacing:${gap}px;" cellpadding="0"><tr><![endif]--><div style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: ${gap}px;">${content}</div><!--[if mso]></tr></table><![endif]--></div>`;
        }
        const verticalStyle = `padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
        return `<div style="${verticalStyle}">${
          gap > 0 ? content.replace(/(<\/div>)(\s*<)/g, `$1<div style="height: ${gap}px;"></div>$2`) : content
        }</div>`;
      }

      case 'Text': {
        const finalContent = processTiptapContent(props.text || '');
        const textAlign = props.textAlign || 'left';
        return `<div style="font-family: ${EMAIL_FONT_FAMILY}; font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5; text-align: ${textAlign};">${finalContent}</div>`;
      }

      case 'Button':
        return `
          <div style="margin: 10px 0;">
            <a href="${props.url || '#'}" style="font-family: ${EMAIL_FONT_FAMILY}; background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">
              ${props.text || 'Button'}
            </a>
          </div>
        `;

      case 'Image':
        return `<img src="${props.src}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;

      case 'Table': {
        const cols = props.columns || 3;
        const headerTexts: string[] = props.headerTexts || [];
        const cellTexts: string[][] = props.cellTexts || [[]];
        const loopKey = props.loopKey || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : props.rows || 1;
        const tableTextAlign = props.textAlign || 'left';

        // Build header row — process tiptap HTML in each cell
        let headerCells = '';
        for (let c = 0; c < cols; c++) {
          const cellContent = processTiptapContent(headerTexts[c] || '');
          headerCells += `<th style="font-family: ${EMAIL_FONT_FAMILY}; border: 1px solid #e4e4e7; padding: 8px 12px; text-align: ${tableTextAlign}; font-weight: 600; background-color: #fafafa;">${cellContent}</th>`;
        }
        const headerRow = `<tr>${headerCells}</tr>`;

        // Build body rows — process tiptap HTML in each cell
        let bodyRows = '';
        for (let r = 0; r < rowCount; r++) {
          let cells = '';
          for (let c = 0; c < cols; c++) {
            const cellContent = processTiptapContent(cellTexts[r]?.[c] || '');
            cells += `<td style="font-family: ${EMAIL_FONT_FAMILY}; border: 1px solid #e4e4e7; padding: 8px 12px; text-align: ${tableTextAlign};">${cellContent}</td>`;
          }
          bodyRows += `<tr>${cells}</tr>`;
        }

        const tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;"><thead>${headerRow}</thead><tbody>${isDynamic ? `{{#${loopKey}}}` : ''}${bodyRows}${isDynamic ? `{{/${loopKey}}}` : ''}</tbody></table>`;
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
      bodyHtml: generateEmailHtml(nodes),
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
        const borderCss = borderPropsToCss(props);

        // Document PDF: use flexbox so react-pdf-html / react-pdf respect layout (no grid/table support).
        // Use longhand flex-grow/flex-shrink/flex-basis so react-pdf-html passes them through; flex shorthand may not be applied.
        if (layout === 'horizontal') {
          const flexChildren = (nodeChildren || []).map(
            (childId: string) =>
              `<div style="flex-grow: 1; flex-shrink: 1; flex-basis: 0; min-width: 0;">${renderNode(childId)}</div>`,
          );
          const inner = flexChildren.join('');
          const flexStyle =
            `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gap}px; padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
          return `<div style="${flexStyle}">${inner}</div>`;
        }
        if (layout === 'grid') {
          // Simulate grid with flex: row wrap + fixed basis per cell (react-pdf has no CSS Grid)
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
        const verticalStyle = `padding: ${pad}px; background-color: ${bgColor}; width: 100%; ${borderCss}`.trim();
        return `<div style="${verticalStyle}">${
          gap > 0 ? content.replace(/(<\/div>)(\s*<)/g, `$1<div style="height: ${gap}px;"></div>$2`) : content
        }</div>`;
      }

      case 'Text': {
        const finalContent = processTiptapContent(props.text || '');
        const textAlign = props.textAlign || 'left';
        return `<div style="font-family: ${EMAIL_FONT_FAMILY}; font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5; text-align: ${textAlign};">${finalContent}</div>`;
      }

      case 'Button':
        return `<div style="margin: 10px 0;"><a href="${props.url || '#'}" style="font-family: ${EMAIL_FONT_FAMILY}; background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">${props.text || 'Button'}</a></div>`;

      case 'Image':
        return `<img src="${props.src}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;

      case 'Table': {
        const cols = props.columns || 3;
        const headerTexts: string[] = props.headerTexts || [];
        const cellTexts: string[][] = props.cellTexts || [[]];
        const loopKey = props.loopKey || '';
        const isDynamic = loopKey.length > 0;
        const rowCount = isDynamic ? 1 : props.rows || 1;
        const tableTextAlign = props.textAlign || 'left';

        let headerCells = '';
        for (let c = 0; c < cols; c++) {
          const cellContent = processTiptapContent(headerTexts[c] || '');
          headerCells += `<th style="font-family: ${EMAIL_FONT_FAMILY}; border: 1px solid #e4e4e7; padding: 8px 12px; text-align: ${tableTextAlign}; font-weight: 600; background-color: #fafafa;">${cellContent}</th>`;
        }
        const headerRow = `<tr>${headerCells}</tr>`;

        let bodyRows = '';
        for (let r = 0; r < rowCount; r++) {
          let cells = '';
          for (let c = 0; c < cols; c++) {
            const cellContent = processTiptapContent(cellTexts[r]?.[c] || '');
            cells += `<td style="font-family: ${EMAIL_FONT_FAMILY}; border: 1px solid #e4e4e7; padding: 8px 12px; text-align: ${tableTextAlign};">${cellContent}</td>`;
          }
          bodyRows += `<tr>${cells}</tr>`;
        }

        return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;"><thead>${headerRow}</thead><tbody>${isDynamic ? `{{#${loopKey}}}` : ''}${bodyRows}${isDynamic ? `{{/${loopKey}}}` : ''}</tbody></table>`;
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
      `display: flex; flex-direction: row; flex-wrap: wrap; gap: ${bodyGap}px; padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}`.trim();
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
      `padding: ${bodyPadding}px; background-color: ${bodyBg}; width: 100%; ${bodyBorderCss}`.trim();
    bodyContentHtml = `<div style="${verticalStyle}">${
      bodyGap > 0
        ? bodyContent.replace(/(<\/div>)(\s*<)/g, `$1<div style="height: ${bodyGap}px;"></div>$2`)
        : bodyContent
    }</div>`;
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
