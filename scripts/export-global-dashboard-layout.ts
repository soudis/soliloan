import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { DashboardLayoutScope, PrismaClient } from '@prisma/client';

/** Writes `prisma/global-dashboard-layout.json` for `prisma/seed.ts`. */
const OUTPUT_FILE = path.join(process.cwd(), 'prisma', 'global-dashboard-layout.json');

function getConnectionCandidates() {
  const candidates = new Set<string>();

  if (process.env.EXPORT_DATABASE_URL) {
    candidates.add(process.env.EXPORT_DATABASE_URL);
  }

  if (process.env.DATABASE_URL) {
    candidates.add(process.env.DATABASE_URL);
  }

  if (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DB) {
    const localhostUrl = `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@localhost:5432/${encodeURIComponent(process.env.POSTGRES_DB)}`;
    candidates.add(localhostUrl);
  }

  return [...candidates];
}

async function connectPrisma() {
  let lastError: unknown;

  for (const connectionString of getConnectionCandidates()) {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
      }),
    });

    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      return prisma;
    } catch (error) {
      lastError = error;
      await prisma.$disconnect();
    }
  }

  throw lastError;
}

async function main() {
  const prisma = await connectPrisma();

  try {
    const row = await prisma.dashboardLayout.findFirst({
      where: { scope: DashboardLayoutScope.GLOBAL_DEFAULT },
      select: { layout: true },
    });

    if (!row) {
      console.error('No GLOBAL_DEFAULT dashboard layout found in the database.');
      process.exitCode = 1;
      return;
    }

    await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

    const payload = {
      layout: row.layout ?? { rows: [] },
    };
    const fileContents = `${JSON.stringify(payload, null, 2)}\n`;
    await writeFile(OUTPUT_FILE, fileContents, 'utf8');
    console.info(`Exported global dashboard layout -> ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error('Failed to export global dashboard layout:', error);
  process.exitCode = 1;
});
