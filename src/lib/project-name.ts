export function getSoliloanProjectName(): string {
  return process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ?? 'Direktkreditplattform';
}
