import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const projects = await db.project.findMany({
      where: {
        managers: {
          some: {
            id: session.user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        configuration: true
      }
    })
    console.log("projects", projects)
    return NextResponse.json(projects)
  } catch (error) {
    console.error("[PROJECTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 