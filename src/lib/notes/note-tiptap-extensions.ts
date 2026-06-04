import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

type NoteTiptapOptions = {
  /** When false, autolink runs only while editing; renderer shows stored links. */
  autolink?: boolean;
  openOnClick?: boolean;
};

export function getNoteTiptapExtensions({ autolink = true, openOnClick = false }: NoteTiptapOptions = {}) {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      code: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      strike: false,
      link: false,
    }),
    Underline,
    Link.configure({
      autolink,
      linkOnPaste: autolink,
      openOnClick,
      defaultProtocol: 'https',
      protocols: ['http', 'https', 'mailto', 'tel'],
      HTMLAttributes: {
        class: 'note-tiptap-link',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
  ];
}
