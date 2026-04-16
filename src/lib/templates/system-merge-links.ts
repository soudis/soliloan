/**
 * App base URL for merge tags and emails. Prefer server `SOLILOAN_URL`, then public env for preview.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.SOLILOAN_URL ?? process.env.NEXT_PUBLIC_SOLILOAN_URL ?? '';
  return raw.replace(/\/+$/, '');
}

/**
 * Placeholder URLs until dedicated routes exist (`{{system.projectLink}}`, etc.).
 */
export function getDefaultSystemLinkMergeData(): {
  projectLink: string;
  lenderLink: string;
  loanLink: string;
} {
  const base = getAppBaseUrl() || '#';
  return {
    projectLink: base,
    lenderLink: base,
    loanLink: base,
  };
}

export function withSystemMergeData<T extends Record<string, unknown>>(data: T): T {
  const links = getDefaultSystemLinkMergeData();
  const existing =
    data.system && typeof data.system === 'object' && data.system !== null
      ? (data.system as Record<string, unknown>)
      : {};
  return {
    ...data,
    system: {
      ...links,
      ...existing,
    },
  } as T;
}
