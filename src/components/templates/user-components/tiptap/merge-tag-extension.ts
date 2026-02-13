import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MergeTagComponent } from './merge-tag-component';

export interface MergeTagOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeTag: {
      /**
       * Insert a merge tag at the current cursor position
       */
      insertMergeTag: (attributes: { id: string; label: string; value: string }) => ReturnType;
    };
  }
}

export const MergeTag = Node.create<MergeTagOptions>({
  name: 'mergeTag',

  group: 'inline',

  inline: true,
  draggable: true,
  selectable: true,

  atom: true, // Treated as a single unit, cannot be edited

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-merge-tag-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-merge-tag-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-merge-tag-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-merge-tag-label': attributes.label,
          };
        },
      },
      value: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-merge-tag')?.replace(/[{}]/g, ''),
        renderHTML: (attributes) => {
          if (!attributes.value) {
            return {};
          }
          return {
            'data-merge-tag': attributes.value,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.merge-tag-pill',
      },
      {
        tag: 'span[data-merge-tag]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'merge-tag-pill',
        'data-merge-tag': node.attrs.value,
        'data-merge-tag-id': node.attrs.id,
        'data-merge-tag-label': node.attrs.label,
      }),
      `{{${node.attrs.label || node.attrs.value}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeTagComponent);
  },

  addCommands() {
    return {
      insertMergeTag:
        (attributes) =>
        ({ chain }) => {
          return chain()
            .insertContent([
              {
                type: 'mergeTag',
                attrs: attributes,
              },
            ])
            .run();
        },
    };
  },
});
