import { revalidatePath } from 'next/cache';

export function revalidateFaqPaths() {
  revalidatePath('/help/faq');
  revalidatePath('/help/faq', 'layout');
}
