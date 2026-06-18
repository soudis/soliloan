import { execFile } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const THUMBNAIL_SIZE = '384x384';

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
  mimeType: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
    return undefined;
  }

  const tempInputPath = join(tmpdir(), `${Date.now()}-input`);
  const tempOutputPath = join(tmpdir(), `${Date.now()}-output`);

  try {
    const binaryData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await writeFile(tempInputPath, binaryData);

    if (mimeType === 'application/pdf') {
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
