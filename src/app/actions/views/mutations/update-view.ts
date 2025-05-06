"use server";

import { ViewType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ViewFormData } from "@/lib/schemas/view";

export async function updateView(viewId: string, data: Partial<ViewFormData>) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Fetch the view
    const view = await db.view.findUnique({
      where: {
        id: viewId,
      },
    });

    if (!view) {
      throw new Error("View not found");
    }

    // Check if the user has access to the view
    if (view.userId !== session.user.id) {
      throw new Error("You do not have access to this view");
    }

    if (data.isDefault) {
      await db.view.updateMany({
        where: {
          type: view.type,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update the view
    const updatedView = await db.view.update({
      where: {
        id: viewId,
      },
      data: {
        name: data.name,
        type: data.type as ViewType,
        data: data.data,
        isDefault: data.isDefault,
      },
    });

    // Revalidate the view
    revalidatePath(`/${view.type.toLowerCase()}`);

    return { view: updatedView };
  } catch (error) {
    console.error("Error updating view:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update view",
    };
  }
}
