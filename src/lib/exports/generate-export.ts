import 'server-only';

import { ExportType } from '@prisma/client';

import { db } from '@/lib/db';
import { buildJahresliste } from '@/lib/exports/jahresliste';
import { jahreslisteXlsx } from '@/lib/exports/jahresliste-xlsx';
import { kontomitteilungenZip } from '@/lib/exports/kontomitteilungen-zip';
import { kontomitteilungRendererUnsafe } from '@/lib/exports/render-kontomitteilungen';
import { getProjectLogoUnsafe } from '@/lib/templates/get-project-logo';
import type { LoanWithRelations } from '@/types/loans';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** An Export of the current year is vorläufig: its figures are computed as of 31 Dec. */
export function isPreliminaryExportYear(year: number, now = new Date()): boolean {
  return year >= now.getFullYear();
}

export function exportFileName(type: ExportType, year: number, preliminary: boolean): string {
  const base = type === ExportType.YEARLY_LIST ? 'Jahresliste' : 'Kontomitteilungen';
  const extension = type === ExportType.YEARLY_LIST ? 'xlsx' : 'zip';
  return `${base}_${year}${preliminary ? '_vorlaeufig' : ''}.${extension}`;
}

/** The Kredite of a project with just what the interest engine and the Exporte read. Caller must enforce access. */
export async function loadExportLoansUnsafe(projectId: string): Promise<LoanWithRelations[]> {
  const loans = await db.loan.findMany({
    where: { lender: { projectId } },
    include: {
      transactions: true,
      lender: {
        select: {
          id: true,
          lenderNumber: true,
          firstName: true,
          lastName: true,
          organisationName: true,
          notificationType: true,
          project: { select: { configuration: { select: { interestMethod: true } } } },
        },
      },
    },
  });
  return loans as unknown as LoanWithRelations[];
}

/**
 * Generates a Jahresliste or the Kontomitteilungen of one year and stores the file as a new Export (ADR 0006).
 * Both cover the same Kreditgeber*innen: everyone with at least one row in the Jahresliste.
 * Caller must enforce project access.
 */
export async function generateExportUnsafe(options: {
  projectId: string;
  type: ExportType;
  year: number;
  userId: string;
}) {
  const { projectId, type, year, userId } = options;
  const preliminary = isPreliminaryExportYear(year);
  const loans = await loadExportLoansUnsafe(projectId);
  const jahresliste = buildJahresliste(loans, year);

  let data: Buffer;
  let mimeType: string;
  if (type === ExportType.YEARLY_LIST) {
    data = await jahreslisteXlsx(jahresliste);
    mimeType = XLSX_MIME;
  } else {
    const render = await kontomitteilungRendererUnsafe({
      projectId,
      year,
      lenders: jahresliste.lenders,
      logo: await getProjectLogoUnsafe(projectId),
    });
    data = await kontomitteilungenZip(jahresliste.lenders, render);
    mimeType = 'application/zip';
  }

  return db.export.create({
    data: {
      projectId,
      type,
      year,
      preliminary,
      fileName: exportFileName(type, year, preliminary),
      mimeType,
      data: new Uint8Array(data),
      createdById: userId,
    },
    select: { id: true, fileName: true },
  });
}

/** All Exporte of a project, newest first, without the file. Caller must enforce project access. */
export function listExportsUnsafe(projectId: string) {
  return db.export.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      year: true,
      preliminary: true,
      fileName: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
}
