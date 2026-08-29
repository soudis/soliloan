import { revalidatePath } from 'next/cache';

export function revalidateForumPaths() {
  revalidatePath('/help/forum');
  revalidatePath('/help/forum', 'layout');
}
