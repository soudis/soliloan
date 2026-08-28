import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

type FaqTiptapOptions = {
  openOnClick?: boolean;
};

export function getFaqTiptapExtensions({ openOnClick = false }: FaqTiptapOptions = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      horizontalRule: false,
      link: false,
    }),
    Underline,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick,
      defaultProtocol: 'https',
      protocols: ['http', 'https', 'mailto', 'tel'],
      HTMLAttributes: {
        class: 'faq-tiptap-link',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'faq-tiptap-image',
      },
    }),
    TableKit.configure({
      table: {
        resizable: false,
        HTMLAttributes: {
          class: 'faq-tiptap-table',
        },
      },
    }),
  ];
}
