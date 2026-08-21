import 'dotenv/config';
import { defineConfig } from 'prisma/config';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
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
