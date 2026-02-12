import { USER_COMPONENTS } from '@/components/templates/user-components';

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
      case 'Container':
        return `<div style="padding: ${props.padding || 0}px; background-color: ${props.background || 'transparent'}; w-full">${content}</div>`;

      case 'Text': {
        // TipTap usually returns HTML wrapped in <p> tags.
        // We want to avoid nested <p> tags if we wrap it ourselves.
        const textValue = (props.text || '').replace(/<p>/g, '').replace(/<\/p>/g, '<br />');

        // Convert <span data-merge-tag="..."> back to {{tag}}.
        // We capture the tag and explicitly strip any existing braces from it
        // to avoid {{{{tag}}}} situations.
        const cleanText = textValue.replace(
          /<span[^>]*data-merge-tag="([^"]*)"[^>]*>.*?<\/span>/g,
          (_match: string, tag: string) => {
            const rawTag = tag.replace(/[{}]/g, '');
            return `{{${rawTag}}}`;
          },
        );

        // Final flattening of any redundant braces just in case.
        const finalContent = cleanText.replace(/\{\{+\s*([^}]*?)\s*\}+/g, '{{$1}}');

        return `<div style="font-size: ${props.fontSize || 16}px; color: ${props.color || '#000000'}; margin: 0; line-height: 1.5;">${finalContent}</div>`;
      }

      case 'Button':
        return `
          <div style="margin: 10px 0;">
            <a href="${props.url || '#'}" style="background-color: ${props.background || '#2563eb'}; color: ${props.color || '#ffffff'}; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">
              ${props.text || 'Button'}
            </a>
          </div>
        `;

      case 'Image':
        return `<img src="${props.src}" style="width: ${props.width || '100%'}; height: auto; display: block; margin: 10px 0;" />`;

      case 'Loop':
        return `{{#${props.loopKey}}}${content}{{/${props.loopKey}}}`;

      case 'Canvas': // Root or sub-canvas
      case 'Element':
        return content;

      default:
        return content;
    }
  };

  return renderNode('ROOT');
};
