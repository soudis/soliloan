'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateProject(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`)
} 