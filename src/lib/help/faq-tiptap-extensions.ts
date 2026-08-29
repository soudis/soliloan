import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

type FaqTiptapOptions = {
  openOnClick?: boolean;
  headings?: boolean;
  autolink?: boolean;
};

export function getFaqTiptapExtensions({
  openOnClick = false,
  headings = true,
  autolink = true,
}: FaqTiptapOptions = {}): Extensions {
  return [
    StarterKit.configure({
      heading: headings ? { levels: [2, 3] } : false,
      horizontalRule: false,
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      autolink,
      linkOnPaste: autolink,
      openOnClick,
      defaultProtocol: 'https',
      protocols: ['http', 'https', 'mailto', 'tel'],
      isAllowedUri: (url, ctx) => {
        if (!url) return false;
        const trimmed = url.trim();
        if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
        return ctx.defaultValidate(trimmed);
      },
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
