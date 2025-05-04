"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function revalidateLender(lenderId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Check if the user has access to the lender's project
    const lender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
          },
        },
      },
    });

    if (!lender) {
      throw new Error("Lender not found");
    }

    // Check if the user has access to the project
    const hasAccess = lender.project.managers.some(
      (manager) => manager.id === session.user.id
    );

    if (!hasAccess) {
      throw new Error("You do not have access to this lender");
    }

    revalidatePath(`/dashboard/lenders/${lenderId}`);
    return { success: true };
  } catch (error) {
    console.error("Error revalidating lender:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to revalidate lender",
    };
  }
}
