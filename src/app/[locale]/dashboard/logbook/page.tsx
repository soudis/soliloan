"use server";

import { getTranslations } from "next-intl/server";

import { LogbookTable } from "@/components/dashboard/logbook/logbook-table";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function LogbookPage() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get the user's projects
  const projects = await db.project.findMany({
    where: {
      managers: {
        some: {
          id: session.user.id,
        },
      },
    },
    include: {
      changes: {
        orderBy: {
          committedAt: "desc",
        },
        include: {
          project: true,
        },
      },
    },
  });

  const t = await getTranslations("logbook");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>
      <LogbookTable changes={projects.flatMap((p) => p.changes)} />
    </div>
  );
}
