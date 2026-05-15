import type { ViewType } from '@prisma/client';

/** Minimal view row for dashboard sidebar (from server). */
export type SidebarNavView = {
  id: string;
  name: string;
  type: ViewType;
  projectId: string | null;
};
