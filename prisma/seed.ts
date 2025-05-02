import { hashPassword } from "@/lib/utils";
import {
  Language,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  if (
    process.env.SOLILOAN_ADMIN_EMAIL &&
    process.env.SOLILOAN_ADMIN_PASSWORD
  ) {
    const passwordHasehd = hashPassword(process.env.SOLILOAN_ADMIN_PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: process.env.SOLILOAN_ADMIN_EMAIL },
      update: {
        isAdmin: true,
      },
      create: {
        email: process.env.SOLILOAN_ADMIN_EMAIL,
        emailVerified: new Date(),
        language: (process.env.SOLILOAN_DEFAULT_LANGUAGE ??
          Language.de) as Language,
        name: "Admin",
        password: passwordHasehd,
        isAdmin: true,
      },
    });
    console.info(`Admin user created: ${process.env.SOLILOAN_ADMIN_EMAIL}`);


    if (process.env.ENVIRONMENT === "dev") {
      const project = await prisma.project.findFirst({
        where: { slug: "dev-gmbh" },
      });
      if (!project) {

        await prisma.project.create({
          data: {
            slug: "dev-gmbh",
            name: "Development GmbH",
            configuration: {
              create: {
                name: "Development GmbH",
              },
            },
            managers: { connect: { id: user.id } }
          },
        });
        console.info("Dev instance and project created");
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
