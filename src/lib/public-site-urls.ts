/** Public footer / marketing URLs (override via env where noted). */
export function getPublicGithubUrl(): string {
  return 'https://github.com/soudis/soliloan';
}

export function getSauriasslOrgUrl(): string {
  return 'https://sauriassl.org';
}

/** Official AGPL-3.0 license text (locale-aware where GNU provides a translation). */
export function getAgplV3LicenseUrl(locale: string): string {
  if (locale === 'de') {
    return 'https://www.gnu.org/licenses/agpl-3.0.de.html';
  }
  return 'https://www.gnu.org/licenses/agpl-3.0.html';
}
