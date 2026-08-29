import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mediaContentDisposition } from '@/lib/media';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!session.user.isManager) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const media = await db.media.findUnique({
      where: { id },
      select: { data: true, mimeType: true, name: true },
    });

    if (!media) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(Buffer.from(media.data), {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Disposition': mediaContentDisposition(media.name),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error downloading media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
