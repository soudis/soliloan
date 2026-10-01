import { mergeAttributes, Node } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { encodeConditionPayload } from '@/lib/templates/template-condition';
import { TemplateConditionComponent } from './template-condition-component';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    templateCondition: {
      insertTemplateCondition: (labels: { thenText: string; elseText: string }) => ReturnType;
    };
  }
}

export const TemplateCondition = Node.create({
  name: 'templateCondition',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      role: {
        default: 'if',
        parseHTML: (element) => element.getAttribute('data-template-condition') ?? 'if',
        renderHTML: (attributes) => ({
          'data-template-condition': attributes.role,
        }),
      },
      condition: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-condition') ?? '',
        renderHTML: (attributes) => {
          if (attributes.role !== 'if' || !attributes.condition) return {};
          return { 'data-condition': attributes.condition };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-template-condition]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'template-condition-pill',
        'data-template-condition': node.attrs.role,
        ...(node.attrs.role === 'if' && node.attrs.condition ? { 'data-condition': node.attrs.condition } : {}),
      }),
      node.attrs.role === 'else' ? 'else' : node.attrs.role === 'end' ? 'end' : 'if',
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateConditionComponent);
  },

  addCommands() {
    return {
      insertTemplateCondition:
        (labels) =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes.templateCondition;
          if (!type) return false;
          const ifNode = type.create({ role: 'if', condition: encodeConditionPayload([]) });
          const elseNode = type.create({ role: 'else', condition: '' });
          const endNode = type.create({ role: 'end', condition: '' });
          const fragment = Fragment.from([
            ifNode,
            state.schema.text(labels.thenText),
            elseNode,
            state.schema.text(labels.elseText),
            endNode,
          ]);
          const { from, to } = state.selection;
          let tr = state.tr.replaceWith(from, to, fragment);
          const thenFrom = from + ifNode.nodeSize;
          tr = tr.setSelection(TextSelection.create(tr.doc, thenFrom, thenFrom + labels.thenText.length));
          dispatch?.(tr);
          return true;
        },
    };
  },
});
