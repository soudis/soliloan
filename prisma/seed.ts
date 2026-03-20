import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { InterestMethod, Language, PrismaClient, TemplateDataset } from '@prisma/client';

import { hashPassword } from '@/lib/utils/password';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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
    dataset: TemplateDataset.LOAN,
  },
  {
    systemKey: 'yearly-account-notification',
    name: 'Jährliche Kontomitteilung',
    description: 'Jährliche Kontomitteilung für Kreditgeber',
    type: 'DOCUMENT' as const,
    dataset: TemplateDataset.LENDER_YEARLY,
  },
];

async function seedSystemTemplates(adminUserId: string) {
  for (const tpl of SYSTEM_TEMPLATES) {
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
          designJson: {},
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
    const passwordHashed = hashPassword(process.env.SOLILOAN_ADMIN_PASSWORD);
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
