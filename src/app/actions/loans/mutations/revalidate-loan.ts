'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateLoan(loanId: string) {
  revalidatePath(`/dashboard/loans/${loanId}`)
} 