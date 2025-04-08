import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ViewType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for validating view data
const viewSchema = z.object({
  type: z.enum(["LENDER", "LOAN"]),
  name: z.string(),
  data: z.record(z.any()),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = viewSchema.parse(body);

    // If this view is set as default, we need to update any existing default views
    if (validatedData.isDefault) {
      // Find and update any existing default views for this user and type
      await db.view.updateMany({
        where: {
          userId: session.user.id,
          type: validatedData.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const view = await db.view.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        name: validatedData.name,
        data: validatedData.data,
        isDefault: validatedData.isDefault || false,
      },
    });

    return NextResponse.json(view);
  } catch (error) {
    console.error("[VIEWS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!type || !["LENDER", "LOAN"].includes(type)) {
      return new NextResponse("Invalid view type", { status: 400 });
    }

    const views = await db.view.findMany({
      where: {
        userId: session.user.id,
        type: type as ViewType,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(views);
  } catch (error) {
    console.error("[VIEWS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 