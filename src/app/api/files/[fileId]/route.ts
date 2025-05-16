import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch the file
    const file = await db.file.findUnique({
      where: {
        id: params.fileId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true,
              },
            },
          },
        },
        loan: {
          include: {
            lender: {
              include: {
                project: {
                  include: {
                    managers: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Check if the user has access to the file
    const hasAccess =
      file.lender?.project.managers.some((manager) => manager.id === session.user.id) ||
      file.loan?.lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess && !file.public) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Return the file data
    return new NextResponse(file.data, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
