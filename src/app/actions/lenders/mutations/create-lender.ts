"use server";

import {
  Country,
  Entity,
  Language,
  NotificationType,
  Operation,
  Salutation,
  MembershipStatus,
  LenderType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createAuditEntry,
  getLenderContext,
  removeNullFields,
} from "@/lib/audit-trail";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LenderFormData } from "@/lib/schemas/lender";
import { getLenderName } from "@/lib/utils";

export async function createLender(data: LenderFormData) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Check if the user has access to the project
    const project = await db.project.findUnique({
      where: {
        id: data.projectId,
      },
      include: {
        managers: true,
        configuration: true,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some(
      (manager) => manager.id === session.user.id
    );

    if (!hasAccess) {
      throw new Error("You do not have access to this project");
    }

    // Create the lender
    const lender = await db.lender.create({
      data: {
        type: data.type as LenderType,
        salutation: data.salutation as Salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        organisationName: data.organisationName,
        titlePrefix: data.titlePrefix,
        titleSuffix: data.titleSuffix,
        street: data.street,
        addon: data.addon,
        zip: data.zip,
        place: data.place,
        country: data.country as Country,
        telNo: data.telNo,
        iban: data.iban,
        bic: data.bic,
        notificationType: data.notificationType as NotificationType,
        membershipStatus: data.membershipStatus as MembershipStatus,
        tag: data.tag,
        ...(data.email && {
          user: {
            connectOrCreate: {
              where: { email: data.email },
              create: {
                email: data.email,
                name: getLenderName(data),
                language: project.configuration?.userLanguage ?? Language.de,
              },
            },
          },
        }),
        project: {
          connect: {
            id: data.projectId,
          },
        },
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: Entity.lender,
      operation: Operation.CREATE,
      primaryKey: lender.id,
      before: {},
      after: removeNullFields(lender),
      context: getLenderContext(lender),
      projectId: data.projectId,
    });

    // Revalidate the lenders page
    revalidatePath(`/dashboard/lenders/${data.projectId}`);

    return { lender };
  } catch (error) {
    console.error("Error creating lender:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create lender",
    };
  }
}
