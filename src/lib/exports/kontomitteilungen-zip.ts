import type { NotificationType } from '@prisma/client';
import AdmZip from 'adm-zip';

import type { JahreslisteLender } from './jahresliste';

/** ZIP folder per Benachrichtigungsart. */
export const NOTIFICATION_TYPE_FOLDERS: Record<NotificationType, string> = {
  EMAIL: 'email',
  POST: 'post',
  ONLINE: 'online',
};

export type RenderedKontomitteilung = {
  /** The template's file name for this Kreditgeber*in, ending in `.pdf`. */
  fileName: string;
  pdf: Uint8Array;
};

/**
 * Zips one Kontomitteilung per Kreditgeber*in into `<Benachrichtigungsart>/<Kreditgeber*in-Nr>_<file name>`.
 * PDFs are rendered one after another: rendering is CPU-bound, so running them in parallel gains nothing.
 */
export async function kontomitteilungenZip(
  lenders: JahreslisteLender[],
  render: (lender: JahreslisteLender) => Promise<RenderedKontomitteilung>,
): Promise<Buffer> {
  const zip = new AdmZip();
  for (const lender of lenders) {
    const { fileName, pdf } = await render(lender);
    const folder = NOTIFICATION_TYPE_FOLDERS[lender.notificationType];
    zip.addFile(`${folder}/${lender.lenderNumber}_${fileName}`, Buffer.from(pdf));
  }
  return zip.toBuffer();
}
