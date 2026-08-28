export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_FORM_FIELD = 'file';

export const MEDIA_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type MediaAllowedMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<MediaAllowedMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

export function isAllowedMediaMimeType(value: string): value is MediaAllowedMimeType {
  return (MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function sniffImageMimeType(bytes: Uint8Array): MediaAllowedMimeType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export function sanitizeMediaFileName(originalName: string, mimeType: MediaAllowedMimeType): string {
  const basename = originalName.split(/[/\\]/).pop()?.trim() ?? '';
  const withoutControlChars = [...basename]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  const asciiSafe = withoutControlChars.replace(/[^\w.\- ()äöüÄÖÜß]+/g, '_').slice(0, 200);
  const extension = MIME_TO_EXTENSION[mimeType];

  if (!asciiSafe || asciiSafe === '.' || asciiSafe === '..') {
    return `image.${extension}`;
  }

  if (/\.(png|jpe?g|webp)$/i.test(asciiSafe)) {
    return asciiSafe.replace(/\.(png|jpe?g|webp)$/i, `.${extension}`);
  }

  return `${asciiSafe}.${extension}`;
}

export function mediaContentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${ascii || 'image'}"`;
}

export function toPrismaBytes(data: Buffer): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(data.byteLength);
  result.set(data);
  return result as Uint8Array<ArrayBuffer>;
}
