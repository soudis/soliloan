import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` reads this config but never connects, so a fresh checkout without
// DATABASE_URL (host tests, hooks, CI) can still generate the client. `.invalid` never
// resolves, so a migrate or seed without DATABASE_URL fails instead of reaching a database.
const PLACEHOLDER_DATABASE_URL = 'postgresql://unset:unset@database-url-not-set.invalid:5432/unset';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return PLACEHOLDER_DATABASE_URL;
  }
  return raw.replace(/\$\{(\w+)\}/g, (_, key: string) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`DATABASE_URL references unset environment variable ${key}`);
    }
    return value;
  });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
