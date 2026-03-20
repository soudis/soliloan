import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const OUTPUT_DIR = path.join(process.cwd(), 'prisma', 'system-template-designs');

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

  await mkdir(OUTPUT_DIR, { recursive: true });

  try {
    const templates = await prisma.communicationTemplate.findMany({
      where: {
        isSystem: true,
        isGlobal: true,
        projectId: null,
        systemKey: {
          not: null,
        },
      },
      select: {
        systemKey: true,
        designJson: true,
      },
      orderBy: {
        systemKey: 'asc',
      },
    });

    for (const template of templates) {
      if (!template.systemKey) continue;

      const filePath = path.join(OUTPUT_DIR, `${template.systemKey}.json`);
      const fileContents = `${JSON.stringify(template.designJson ?? {}, null, 2)}\n`;
      await writeFile(filePath, fileContents, 'utf8');
      console.info(`Exported ${template.systemKey} -> ${path.relative(process.cwd(), filePath)}`);
    }

    console.info(`Exported ${templates.length} global system template design(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(async (error) => {
    console.error('Failed to export email templates:', error);
    process.exitCode = 1;
  });
