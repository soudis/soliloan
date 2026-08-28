import { isAllowedMediaMimeType, MEDIA_FORM_FIELD, MEDIA_MAX_BYTES } from '@/lib/media';

export async function uploadFaqImage(file: File): Promise<string> {
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error('error.media.tooLarge');
  }
  if (file.type && !isAllowedMediaMimeType(file.type) && !file.type.startsWith('image/')) {
    throw new Error('error.media.invalidType');
  }

  const formData = new FormData();
  formData.append(MEDIA_FORM_FIELD, file);
  const response = await fetch('/api/media', { method: 'POST', body: formData });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'error.serverError');
  }
  return payload.url;
}
