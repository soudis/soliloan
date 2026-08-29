export function slugFieldError(error: unknown): { fieldErrors: { slug: string } } | null {
  if (
    error instanceof Error &&
    (error.message === 'error.faq.slugTaken' ||
      error.message === 'error.faq.slugReserved' ||
      error.message === 'error.forum.slugTaken' ||
      error.message === 'error.forum.slugReserved')
  ) {
    return { fieldErrors: { slug: error.message } };
  }
  return null;
}
