import { exec } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function toPrismaBytes(data: Buffer): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(data.byteLength);
  result.set(data);
  return result as Uint8Array<ArrayBuffer>;
}

/** Generates a 384×384 thumbnail for images and the first page of PDFs via ImageMagick `convert`. */
export async function createThumbnail(
  data: Buffer | Uint8Array,
  mimeType: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
    return undefined;
  }

  try {
    const binaryData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const tempInputPath = join(tmpdir(), `${Date.now()}-input`);
    const tempOutputPath = join(tmpdir(), `${Date.now()}-output`);

    await writeFile(tempInputPath, binaryData);

    if (mimeType === 'application/pdf') {
      await execAsync(
        `convert -density 300 "${tempInputPath}[0]" -background white -alpha remove -alpha off -resize 384x384^ -gravity center -extent 384x384 -quality 90 "${tempOutputPath}.png"`,
      );
      await execAsync(`mv "${tempOutputPath}.png" "${tempOutputPath}"`);
    } else {
      await execAsync(
        `convert "${tempInputPath}" -resize 384x384^ -gravity center -extent 384x384 "${tempOutputPath}"`,
      );
    }

    const thumbnailBuffer = await readFile(tempOutputPath);

    await Promise.all([unlink(tempInputPath), unlink(tempOutputPath)]);

    return toPrismaBytes(thumbnailBuffer);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return undefined;
  }
}
