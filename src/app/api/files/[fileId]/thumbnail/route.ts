import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch the file
    const file = await db.file.findUnique({
      where: {
        id: (await params).fileId,
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

    // If no thumbnail exists, return 404
    if (!file.thumbnail) {
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    // Return the thumbnail data
    return new NextResponse(file.thumbnail, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error downloading thumbnail:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
