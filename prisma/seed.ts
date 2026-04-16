import 'dotenv/config';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { InterestMethod, Language, PrismaClient, TemplateDataset, type Prisma } from '@prisma/client';

import { hashPassword } from '@/lib/utils/password';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const SYSTEM_TEMPLATE_DESIGNS_DIR = path.join(process.cwd(), 'prisma', 'system-template-designs');

const SYSTEM_TEMPLATES = [
  {
    systemKey: 'password-reset-email',
    name: 'Passwort zurücksetzen',
    description: 'E-Mail zum Zurücksetzen des Passworts',
    type: 'EMAIL' as const,
    dataset: TemplateDataset.USER,
  },
  {
    systemKey: 'manager-invite-email',
    name: 'Manager-Einladung',
    description: 'E-Mail-Einladung für Projektmanager',
    type: 'EMAIL' as const,
    dataset: TemplateDataset.PROJECT,
  },
  {
    systemKey: 'lender-invite-email',
    name: 'Kreditgeber-Einladung',
    description: 'E-Mail-Einladung für Kreditgeber',
    type: 'EMAIL' as const,
    dataset: TemplateDataset.LENDER,
  },
  {
    systemKey: 'transaction-notification-email',
    name: 'Transaktionsbenachrichtigung',
    description: 'E-Mail-Benachrichtigung über neue Transaktionen an Kreditgeber',
    type: 'EMAIL' as const,
    dataset: TemplateDataset.TRANSACTION,
  },
  {
    systemKey: 'yearly-account-notification',
    name: 'Jährliche Kontomitteilung',
    description: 'Jährliche Kontomitteilung für Kreditgeber',
    type: 'DOCUMENT' as const,
    dataset: TemplateDataset.LENDER_YEARLY,
  },
  {
    systemKey: 'defaultEmail',
    name: 'Standardvorlage E-Mail',
    description: 'Ausgangsdesign für neue E-Mail-Vorlagen (bearbeitbar unter Admin)',
    type: 'EMAIL' as const,
    dataset: TemplateDataset.LENDER,
  },
  {
    systemKey: 'defaultDocument',
    name: 'Standardvorlage Dokument',
    description: 'Ausgangsdesign für neue Dokumentvorlagen (bearbeitbar unter Admin)',
    type: 'DOCUMENT' as const,
    dataset: TemplateDataset.LENDER,
  },
];

type LoadedSystemTemplateFile = {
  designJson: Prisma.InputJsonValue;
  subjectOrFilename: string | null;
};

function normalizeSubjectOrFilename(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Loads `prisma/system-template-designs/<systemKey>.json`.
 * Format from `scripts/export-email-templates.ts`: `{ designJson, subjectOrFilename }`.
 * Legacy files are raw design JSON only (no wrapper) — `subjectOrFilename` is then null.
 */
async function loadSystemTemplateDesign(systemKey: string): Promise<LoadedSystemTemplateFile> {
  const filePath = path.join(SYSTEM_TEMPLATE_DESIGNS_DIR, `${systemKey}.json`);

  try {
    const fileContent = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(fileContent);
    if (parsed && typeof parsed === 'object' && parsed !== null && 'designJson' in parsed) {
      const o = parsed as { designJson?: unknown; subjectOrFilename?: unknown };
      return {
        designJson: (o.designJson ?? {}) as Prisma.InputJsonValue,
        subjectOrFilename: normalizeSubjectOrFilename(o.subjectOrFilename),
      };
    }
    return {
      designJson: parsed as Prisma.InputJsonValue,
      subjectOrFilename: null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { designJson: {}, subjectOrFilename: null };
    }
    throw error;
  }
}

async function seedSystemTemplates(adminUserId: string) {
  await mkdir(SYSTEM_TEMPLATE_DESIGNS_DIR, { recursive: true });

  for (const tpl of SYSTEM_TEMPLATES) {
    const { designJson, subjectOrFilename } = await loadSystemTemplateDesign(tpl.systemKey);

    // cannot use upsert because of the unique constraint on systemKey and projectId and prisma does not support unique on null values, while postgres does
    const exists = await prisma.communicationTemplate.findFirst({
      where: {
        systemKey: tpl.systemKey,
        projectId: null,
      },
    });
    if (!exists) {
      await prisma.communicationTemplate.create({
        data: {
          systemKey: tpl.systemKey,
          name: tpl.name,
          description: tpl.description,
          type: tpl.type,
          dataset: tpl.dataset,
          designJson,
          subjectOrFilename,
          isGlobal: true,
          isSystem: true,
          createdBy: { connect: { id: adminUserId } },
        },
      });
    }
  }
  console.info(`Seeded ${SYSTEM_TEMPLATES.length} system templates`);
}

async function main() {
  if (process.env.SOLILOAN_ADMIN_EMAIL && process.env.SOLILOAN_ADMIN_PASSWORD) {
    const passwordHashed = await hashPassword(process.env.SOLILOAN_ADMIN_PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: process.env.SOLILOAN_ADMIN_EMAIL },
      update: {
        isAdmin: true,
      },
      create: {
        email: process.env.SOLILOAN_ADMIN_EMAIL,
        emailVerified: new Date(),
        language: (process.env.SOLILOAN_DEFAULT_LANGUAGE ?? Language.de) as Language,
        name: 'Admin',
        password: passwordHashed,
        isAdmin: true,
      },
    });
    console.info(`Admin user created: ${process.env.SOLILOAN_ADMIN_EMAIL}`);

    await seedSystemTemplates(user.id);

    if (process.env.ENVIRONMENT === 'dev') {
      const project = await prisma.project.findFirst({
        where: { slug: 'dev-gmbh' },
      });
      if (!project) {
        await prisma.project.create({
          data: {
            slug: 'dev-gmbh',
            configuration: {
              create: {
                name: 'Development GmbH',
                interestMethod: InterestMethod.ACT_360_COMPOUND,
              },
            },
            managers: { connect: { id: user.id } },
          },
        });
        console.info('Dev instance and project created');
      }
    }
  }
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
