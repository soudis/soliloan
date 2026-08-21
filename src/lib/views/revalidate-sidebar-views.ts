import { revalidatePath } from 'next/cache';

/** Pinned views are loaded in the dashboard layout. */
export function revalidateSidebarViews() {
  revalidatePath('/', 'layout');
}
