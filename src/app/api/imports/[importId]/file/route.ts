import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contentDispositionAttachment } from '@/lib/utils/file';

/** Downloads the original file of an Import, for admins and managers of its project. */
export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const found = await db.import.findUnique({
    where: { id: importId },
    select: {
      fileName: true,
      fileMimeType: true,
      fileData: true,
      project: { select: { managers: { where: { id: session.user.id }, select: { id: true } } } },
    },
  });
  if (!found) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!session.user.isAdmin && found.project.managers.length === 0) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse(found.fileData, {
    headers: {
      'Content-Type': found.fileMimeType,
      'Content-Disposition': contentDispositionAttachment(found.fileName),
    },
  });
}
