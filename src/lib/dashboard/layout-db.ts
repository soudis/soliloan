import type { Prisma } from '@prisma/client';
import { createDefaultLayoutData } from '@/lib/dashboard/layout-utils';
import { normalizeDashboardLayout } from '@/lib/dashboard/normalize-dashboard-layout';
import { db } from '@/lib/db';
import { dashboardLayoutDataSaveSchema, dashboardLayoutDataSchema } from '@/lib/schemas/dashboard-layout';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

const SCOPE_GLOBAL_DEFAULT = 'GLOBAL_DEFAULT' as const;
const SCOPE_PROJECT = 'PROJECT' as const;
const SCOPE_USER = 'USER' as const;

export type PersistedDashboardLayoutScope = typeof SCOPE_PROJECT | typeof SCOPE_USER;

export async function getGlobalDefaultLayout(): Promise<DashboardLayoutData> {
  const row = await db.dashboardLayout.findFirst({
    where: { scope: SCOPE_GLOBAL_DEFAULT },
  });
  if (!row) {
    return createDefaultLayoutData();
  }
  return normalizeDashboardLayout(dashboardLayoutDataSchema.parse(row.layout));
}

export async function resolveScopedLayout(
  scope: PersistedDashboardLayoutScope,
  id: string,
): Promise<{ layout: DashboardLayoutData; isPersisted: boolean }> {
  const where = scope === SCOPE_PROJECT ? { scope, projectId: id } : { scope, userId: id };

  const row = await db.dashboardLayout.findFirst({ where });
  if (row) {
    return {
      layout: normalizeDashboardLayout(dashboardLayoutDataSchema.parse(row.layout)),
      isPersisted: true,
    };
  }

  const globalDefault = await getGlobalDefaultLayout();
  return {
    layout: normalizeDashboardLayout(structuredClone(globalDefault)),
    isPersisted: false,
  };
}

export async function upsertGlobalDefaultLayout(layout: DashboardLayoutData): Promise<void> {
  const parsed = dashboardLayoutDataSaveSchema.parse(layout);
  const layoutJson = parsed as unknown as Prisma.InputJsonValue;

  const existing = await db.dashboardLayout.findFirst({
    where: { scope: SCOPE_GLOBAL_DEFAULT },
  });

  if (existing) {
    await db.dashboardLayout.update({
      where: { id: existing.id },
      data: { layout: layoutJson },
    });
    return;
  }

  await db.dashboardLayout.create({
    data: {
      scope: SCOPE_GLOBAL_DEFAULT,
      layout: layoutJson,
    },
  });
}

export async function upsertScopedLayout(
  scope: PersistedDashboardLayoutScope,
  layout: DashboardLayoutData,
  id: string,
): Promise<void> {
  const parsed = dashboardLayoutDataSaveSchema.parse(layout);
  const layoutJson = parsed as unknown as Prisma.InputJsonValue;

  if (scope === SCOPE_PROJECT) {
    await db.dashboardLayout.upsert({
      where: { projectId: id },
      create: {
        scope: SCOPE_PROJECT,
        projectId: id,
        layout: layoutJson,
      },
      update: { layout: layoutJson },
    });
    return;
  }

  await db.dashboardLayout.upsert({
    where: { userId: id },
    create: {
      scope: SCOPE_USER,
      userId: id,
      layout: layoutJson,
    },
    update: { layout: layoutJson },
  });
}
