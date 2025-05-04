"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getProjects() {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Fetch all projects for the user
    const projects = await db.project.findMany({
      where: {
        managers: {
          some: {
            id: session.user.id,
          },
        },
      },
      include: {
        configuration: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { projects };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch projects",
    };
  }
}
