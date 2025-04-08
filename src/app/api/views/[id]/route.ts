import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const viewId = params.id;
    if (!viewId) {
      return new NextResponse("View ID is required", { status: 400 });
    }

    // Check if the view exists and belongs to the user
    const view = await db.view.findUnique({
      where: {
        id: viewId,
        userId: session.user.id,
      },
    });

    if (!view) {
      return new NextResponse("View not found", { status: 404 });
    }

    // Delete the view
    await db.view.delete({
      where: {
        id: viewId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[VIEW_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 