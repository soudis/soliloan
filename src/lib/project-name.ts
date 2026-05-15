export function getSoliloanProjectName(): string {
  return (
    process.env.SOLILOAN_PROJECT_NAME ??
    process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ??
    'Direktkreditplattform'
  );
}
