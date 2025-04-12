'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateLender(lenderId: string) {
  revalidatePath(`/dashboard/lenders/${lenderId}`)
} 