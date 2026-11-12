import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contentDispositionAttachment } from '@/lib/utils/file';

/** GET /api/exports/[exportId]: the stored file of an Export, for admins and the project's managers. */
export async function GET(_request: Request, { params }: { params: Promise<{ exportId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { exportId } = await params;
  const managerFilter = session.user.isAdmin ? {} : { project: { managers: { some: { id: session.user.id } } } };
  const stored = await db.export.findFirst({
    where: { id: exportId, ...managerFilter },
    select: { fileName: true, mimeType: true, data: true },
  });
  if (!stored) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(stored.data, {
    headers: {
      'Content-Type': stored.mimeType,
      'Content-Disposition': contentDispositionAttachment(stored.fileName),
      'Cache-Control': 'private, no-store',
    },
  });
}
