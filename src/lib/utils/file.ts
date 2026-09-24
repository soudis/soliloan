import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { sniffMimeType } from './mime';

const execFileAsync = promisify(execFile);

const THUMBNAIL_SIZE = '384x384';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function cropToSquareThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync('convert', [
    inputPath,
    '-background',
    'white',
    '-gravity',
    'center',
    '-resize',
    `${THUMBNAIL_SIZE}^`,
    '-extent',
    THUMBNAIL_SIZE,
    outputPath,
  ]);
}

async function createPdfThumbnail(inputPath: string, outputPath: string): Promise<void> {
  const pagePrefix = `${outputPath}-page`;

  // ImageMagick needs Ghostscript for PDFs, which is not installed in our Docker image.
  // poppler-utils (pdftoppm) is available and handles PDF rendering directly.
  await execFileAsync('pdftoppm', [
    '-png',
    '-f',
    '1',
    '-l',
    '1',
    '-singlefile',
    '-scale-to',
    '384',
    inputPath,
    pagePrefix,
  ]);

  await cropToSquareThumbnail(`${pagePrefix}.png`, outputPath);
  await unlink(`${pagePrefix}.png`).catch(() => {});
}

function toPrismaBytes(data: Buffer): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(data.byteLength);
  result.set(data);
  return result as Uint8Array<ArrayBuffer>;
}

/** Generates a 384×384 thumbnail for images (ImageMagick) and PDFs (pdftoppm + ImageMagick). */
export async function createThumbnail(
  data: Buffer | Uint8Array,
  mimeType?: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const binaryData = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (binaryData.byteLength > MAX_UPLOAD_BYTES) {
    return undefined;
  }

  const sourceType = mimeType ?? sniffMimeType(binaryData);
  if (!sourceType || (sourceType !== 'application/pdf' && !sourceType.startsWith('image/'))) {
    return undefined;
  }

  const uniqueId = randomUUID();
  const tempInputPath = join(tmpdir(), `${uniqueId}-input`);
  const tempOutputPath = join(tmpdir(), `${uniqueId}-output`);

  try {
    await writeFile(tempInputPath, binaryData);

    if (sourceType === 'application/pdf') {
      await createPdfThumbnail(tempInputPath, tempOutputPath);
    } else {
      await cropToSquareThumbnail(tempInputPath, tempOutputPath);
    }

    const thumbnailBuffer = await readFile(tempOutputPath);
    return toPrismaBytes(thumbnailBuffer);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return undefined;
  } finally {
    await Promise.all([unlink(tempInputPath), unlink(tempOutputPath)]).catch(() => {});
  }
}

const FILENAME_BAD_CHARS = /[/\\?%*:|"<>]/g;

function contentDisposition(disposition: 'attachment' | 'inline', name: string): string {
  const safeName =
    name
      .replace(FILENAME_BAD_CHARS, '_')
      .replace(/[\r\n]/g, '')
      .trim() || 'download';
  return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

export function contentDispositionAttachment(name: string): string {
  return contentDisposition('attachment', name);
}

export function contentDispositionInline(name: string): string {
  return contentDisposition('inline', name);
}
