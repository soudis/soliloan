import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { InterestMethod, Language, PrismaClient } from '@prisma/client';

import { hashPassword } from '@/lib/utils/password';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
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
