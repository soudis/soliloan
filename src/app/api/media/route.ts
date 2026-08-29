import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  MEDIA_FORM_FIELD,
  MEDIA_MAX_BYTES,
  mediaUrl,
  sanitizeMediaFileName,
  sniffImageMimeType,
  toPrismaBytes,
} from '@/lib/media';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'error.invalidParameters' }, { status: 400 });
    }

    const file = formData.get(MEDIA_FORM_FIELD);
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'error.media.missingFile' }, { status: 400 });
    }
    if (file.size > MEDIA_MAX_BYTES) {
      return NextResponse.json({ error: 'error.media.tooLarge' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageMimeType(buffer);
    if (!mimeType) {
      return NextResponse.json({ error: 'error.media.invalidType' }, { status: 400 });
    }

    const name = sanitizeMediaFileName(file.name, mimeType);
    const media = await db.media.create({
      data: {
        mimeType,
        name,
        data: toPrismaBytes(buffer),
        createdBy: { connect: { id: session.user.id } },
      },
      select: { id: true, mimeType: true, name: true },
    });

    return NextResponse.json(
      {
        id: media.id,
        url: mediaUrl(media.id),
        name: media.name,
        mimeType: media.mimeType,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'error.serverError' }, { status: 500 });
  }
}
