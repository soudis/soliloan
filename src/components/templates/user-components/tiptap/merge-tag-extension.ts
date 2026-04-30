import { type Editor, mergeAttributes, Node } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import {
  DEFAULT_LOOP_BODY_PLACEHOLDER_VISIBLE,
  type MergeTagLoopInsertParts,
  mergeTagLoopPillAttrs,
} from '@/lib/templates/tiptap-merge-loop';
import { MergeTagComponent } from './merge-tag-component';

export interface MergeTagOptions {
  HTMLAttributes: Record<string, unknown>;
  loopBodyPlaceholder: string;
}

type LoopInsertPayload = MergeTagLoopInsertParts;

function resolveLoopBodyPlaceholder(editor: Editor): string {
  for (const ext of editor.extensionManager.extensions) {
    if (
      ext.name === 'mergeTag' &&
      ext.options &&
      typeof (ext.options as MergeTagOptions).loopBodyPlaceholder === 'string'
    ) {
      return (ext.options as MergeTagOptions).loopBodyPlaceholder;
    }
  }
  return DEFAULT_LOOP_BODY_PLACEHOLDER_VISIBLE;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeTag: {
      /**
       * Insert a merge tag at the current cursor position
       */
      insertMergeTag: (attributes: { id: string; label: string; value: string }) => ReturnType;

      insertMergeTagLoop: (loop: LoopInsertPayload) => ReturnType;
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
      loopBodyPlaceholder: DEFAULT_LOOP_BODY_PLACEHOLDER_VISIBLE,
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

      insertMergeTagLoop:
        (loop) =>
        ({ state, dispatch, editor }) => {
          const start = mergeTagLoopPillAttrs(loop, 'start');
          const end = mergeTagLoopPillAttrs(loop, 'end');
          const visible = resolveLoopBodyPlaceholder(editor);

          const mergeTagType = state.schema.nodes.mergeTag;
          if (!mergeTagType) return false;

          const frag = Fragment.from([
            mergeTagType.create(start),
            state.schema.text(visible),
            mergeTagType.create(end),
          ]);

          const { from, to } = state.selection;
          let tr = state.tr.replaceWith(from, to, frag);

          let phFrom = -1;
          tr.doc.nodesBetween(from, Math.min(from + 256, tr.doc.content.size), (node, pos) => {
            if (node.isText && node.text && visible.length > 0) {
              const idx = node.text.indexOf(visible);
              if (idx !== -1) {
                phFrom = pos + idx;
                return false;
              }
            }
          });

          if (phFrom >= 0) {
            tr = tr.setSelection(TextSelection.create(tr.doc, phFrom, phFrom + visible.length));
          }

          dispatch?.(tr);
          return true;
        },
    };
  },
});
