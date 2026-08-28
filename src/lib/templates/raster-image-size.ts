export type RasterSize = { width: number; height: number };

function readJpegSize(buffer: Buffer): RasterSize | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + size;
  }
  return null;
}

export function readRasterSize(buffer: Buffer): RasterSize | null {
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return readJpegSize(buffer);
}

export function readRasterSizeFromDataUrl(dataUrl: string): RasterSize | null {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(dataUrl);
  if (!match?.[1]) return null;
  return readRasterSize(Buffer.from(match[1], 'base64'));
}

export async function measureRasterSrc(src: string): Promise<RasterSize | null> {
  const fromDataUrl = readRasterSizeFromDataUrl(src);
  if (fromDataUrl) return fromDataUrl;
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    return readRasterSize(Buffer.from(await response.arrayBuffer()));
  } catch {
    return null;
  }
}
