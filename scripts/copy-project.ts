/**
 * Copy one Soliloan project from a source Postgres database to a target database.
 *
 * Usage (from repo root, after `pnpm prisma:generate`):
 *
 *   pnpm exec tsx scripts/copy-project.ts --slug source-slug
 *   pnpm exec tsx scripts/copy-project.ts --slug source-slug --target-slug copied-slug
 *   pnpm exec tsx scripts/copy-project.ts --slug source-slug --include-bank
 *   pnpm exec tsx scripts/copy-project.ts --slug source-slug --dry-run
 *
 * Env (default file `scripts/.copy-project.env`, override with `--env path`):
 *
 *   SOURCE_DATABASE_URL=postgresql://...
 *   TARGET_DATABASE_URL=postgresql://...
 *
 * Typical SSH tunnel (avoid colliding with local dev on 5432):
 *
 *   ssh -N -L 15432:127.0.0.1:5432 -L 15433:127.0.0.1:5433 user@server
 */
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';

const TRANSACTION_TIMEOUT_MS = 10 * 60 * 1000;
const FILE_BATCH_SIZE = 5;
const CREATE_MANY_CHUNK = 200;

type CliOptions = {
  slug: string;
  targetSlug: string | null;
  includeBank: boolean;
  dryRun: boolean;
  envPath: string;
  help: boolean;
};

type MigrationRow = { migration_name: string };

type UserPlan =
  | { sourceId: string; action: 'reuse'; targetId: string; email: string | null }
  | { sourceId: string; action: 'create'; targetId: string; email: string | null; conflictId: boolean };

function printHelp() {
  console.info(`Copy one Soliloan project between two Postgres databases.

Usage:
  pnpm exec tsx scripts/copy-project.ts --slug <source-slug> [options]

Options:
  --slug <slug>           Source project slug (required)
  --target-slug <slug>    Slug to write on the target (default: keep source slug)
  --include-bank          Also copy GoCardless bank connection / import rows
  --dry-run               Print plan and counts; do not write
  --env <path>            Env file with SOURCE_DATABASE_URL and TARGET_DATABASE_URL
                          (default: scripts/.copy-project.env)
  --help                  Show this help
`);
}

const DEFAULT_ENV_PATH = 'scripts/.copy-project.env';

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    slug: '',
    targetSlug: null,
    includeBank: false,
    dryRun: false,
    envPath: DEFAULT_ENV_PATH,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--include-bank') {
      options.includeBank = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--slug') {
      options.slug = argv[++i] ?? '';
    } else if (arg === '--target-slug') {
      options.targetSlug = argv[++i] ?? '';
    } else if (arg === '--env') {
      options.envPath = argv[++i] ?? DEFAULT_ENV_PATH;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function createClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function newCuidLikeId() {
  return `c${Date.now().toString(36)}${randomBytes(8).toString('hex')}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function jsonOrOmit(value: Prisma.JsonValue | null | undefined): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

async function listFinishedMigrations(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<MigrationRow[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
    ORDER BY migration_name
  `;
  return rows.map((row) => row.migration_name);
}

function assertMigrationsMatch(source: string[], target: string[]) {
  if (source.length !== target.length || source.some((name, i) => name !== target[i])) {
    const onlySource = source.filter((name) => !target.includes(name));
    const onlyTarget = target.filter((name) => !source.includes(name));
    const details = [
      onlySource.length ? `only on source: ${onlySource.join(', ')}` : null,
      onlyTarget.length ? `only on target: ${onlyTarget.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');
    throw new Error(`Migration lists differ between source and target${details ? ` (${details})` : ''}`);
  }
}

async function planUsers(
  source: PrismaClient,
  target: PrismaClient,
  sourceUserIds: Set<string>,
): Promise<{ plans: UserPlan[]; usersToCreate: Awaited<ReturnType<typeof source.user.findMany>> }> {
  const sourceUsers = await source.user.findMany({
    where: { id: { in: [...sourceUserIds] } },
  });

  const emails = sourceUsers.map((user) => user.email).filter((email): email is string => !!email);
  const targetByEmail = new Map(
    (
      await target.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      })
    ).map((user) => [user.email as string, user]),
  );
  const targetById = new Map(
    (
      await target.user.findMany({
        where: { id: { in: sourceUsers.map((user) => user.id) } },
        select: { id: true, email: true },
      })
    ).map((user) => [user.id, user]),
  );

  const plans: UserPlan[] = [];
  const usersToCreate: typeof sourceUsers = [];

  for (const user of sourceUsers) {
    if (user.email && targetByEmail.has(user.email)) {
      const existing = targetByEmail.get(user.email);
      if (!existing) continue;
      plans.push({
        sourceId: user.id,
        action: 'reuse',
        targetId: existing.id,
        email: user.email,
      });
      continue;
    }

    const idTaken = targetById.get(user.id);
    const conflictId = !!idTaken && idTaken.email !== user.email;
    const targetId = conflictId ? newCuidLikeId() : user.id;

    plans.push({
      sourceId: user.id,
      action: 'create',
      targetId,
      email: user.email,
      conflictId,
    });
    usersToCreate.push(user);
  }

  return { plans, usersToCreate };
}

function buildUserIdMap(plans: UserPlan[]): Map<string, string> {
  return new Map(plans.map((plan) => [plan.sourceId, plan.targetId]));
}

function remapUserId(map: Map<string, string>, sourceId: string): string {
  const targetId = map.get(sourceId);
  if (!targetId) {
    throw new Error(`Missing user remap for ${sourceId}`);
  }
  return targetId;
}

async function collectReferencedUserIds(source: PrismaClient, projectId: string): Promise<Set<string>> {
  const ids = new Set<string>();

  const project = await source.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { managers: { select: { id: true } } },
  });
  for (const manager of project.managers) ids.add(manager.id);

  const lenders = await source.lender.findMany({
    where: { projectId },
    select: { email: true },
  });
  const emails = [...new Set(lenders.map((lender) => lender.email).filter((email): email is string => !!email))];
  if (emails.length > 0) {
    const usersByEmail = await source.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    for (const user of usersByEmail) ids.add(user.id);
  }

  const [files, notes, templates, blocks, views] = await Promise.all([
    source.file.findMany({
      where: { lender: { projectId } },
      select: { createdById: true },
    }),
    source.note.findMany({
      where: { lender: { projectId } },
      select: { createdById: true },
    }),
    source.communicationTemplate.findMany({
      where: { projectId },
      select: { createdById: true },
    }),
    source.predefinedCraftBlock.findMany({
      where: { projectId },
      select: { createdById: true },
    }),
    source.view.findMany({
      where: { projectId },
      select: { userId: true },
    }),
  ]);

  for (const row of files) ids.add(row.createdById);
  for (const row of notes) ids.add(row.createdById);
  for (const row of templates) ids.add(row.createdById);
  for (const row of blocks) ids.add(row.createdById);
  for (const row of views) ids.add(row.userId);

  return ids;
}

async function createManyChunked<T extends object>(
  createMany: (args: { data: T[] }) => Promise<unknown>,
  rows: T[],
) {
  for (const part of chunk(rows, CREATE_MANY_CHUNK)) {
    if (part.length === 0) continue;
    await createMany({ data: part });
  }
}

async function main() {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.slug) {
    console.error('Missing required --slug');
    printHelp();
    process.exitCode = 1;
    return;
  }

  const envPath = resolve(process.cwd(), options.envPath);
  const envResult = loadEnvFile({ path: envPath, quiet: true });
  if (envResult.error && (envResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw envResult.error;
  }

  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    throw new Error(
      `SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required (loaded from ${options.envPath})`,
    );
  }

  const source = createClient(sourceUrl);
  const target = createClient(targetUrl);

  try {
    await Promise.all([source.$queryRawUnsafe('SELECT 1'), target.$queryRawUnsafe('SELECT 1')]);

    const [sourceMigrations, targetMigrations] = await Promise.all([
      listFinishedMigrations(source),
      listFinishedMigrations(target),
    ]);
    assertMigrationsMatch(sourceMigrations, targetMigrations);
    console.info(`Migrations match (${sourceMigrations.length} finished).`);

    const project = await source.project.findUnique({
      where: { slug: options.slug },
      include: {
        managers: { select: { id: true } },
        configuration: true,
      },
    });
    if (!project) {
      throw new Error(`Source project not found for slug "${options.slug}"`);
    }

    const targetSlug = options.targetSlug || project.slug;
    const existingTarget = await target.project.findUnique({
      where: { slug: targetSlug },
      select: { id: true },
    });
    if (existingTarget) {
      throw new Error(`Target already has a project with slug "${targetSlug}"`);
    }

    const projectId = project.id;
    const configuration = project.configuration;

    const [
      loanTemplates,
      investmentTypes,
      lenders,
      loans,
      transactions,
      notes,
      changes,
      views,
      templates,
      blocks,
      dashboardLayout,
      bankConnections,
      bankImportBatch,
      fileCount,
    ] = await Promise.all([
      source.loanTemplate.findMany({ where: { configurationId: configuration.id } }),
      source.investmentType.findMany({ where: { projectId } }),
      source.lender.findMany({ where: { projectId } }),
      source.loan.findMany({ where: { lender: { projectId } } }),
      source.transaction.findMany({ where: { loan: { lender: { projectId } } } }),
      source.note.findMany({ where: { lender: { projectId } } }),
      source.change.findMany({ where: { projectId } }),
      source.view.findMany({ where: { projectId } }),
      source.communicationTemplate.findMany({ where: { projectId } }),
      source.predefinedCraftBlock.findMany({ where: { projectId } }),
      source.dashboardLayout.findFirst({
        where: { projectId, scope: 'PROJECT' },
      }),
      options.includeBank
        ? source.bankConnection.findMany({ where: { projectId } })
        : Promise.resolve([]),
      options.includeBank
        ? source.bankImportBatch.findUnique({ where: { projectId } })
        : Promise.resolve(null),
      source.file.count({ where: { lender: { projectId } } }),
    ]);

    const connectionIds = bankConnections.map((row) => row.id);
    const [importedBankTransactions, bankImportRows] = options.includeBank
      ? await Promise.all([
          connectionIds.length
            ? source.importedBankTransaction.findMany({
                where: { connectionId: { in: connectionIds } },
              })
            : Promise.resolve([]),
          bankImportBatch
            ? source.bankImportRow.findMany({ where: { batchId: bankImportBatch.id } })
            : Promise.resolve([]),
        ])
      : [[], []];

    const referencedUserIds = await collectReferencedUserIds(source, projectId);
    const { plans: userPlans, usersToCreate } = await planUsers(source, target, referencedUserIds);
    const userIdMap = buildUserIdMap(userPlans);

    console.info(`Source project: ${project.slug} (${projectId})`);
    console.info(`Target slug: ${targetSlug}`);
    console.info('Counts:');
    console.info(`  users referenced: ${userPlans.length}`);
    console.info(`  users to create: ${userPlans.filter((p) => p.action === 'create').length}`);
    console.info(`  users to reuse: ${userPlans.filter((p) => p.action === 'reuse').length}`);
    console.info(`  loanTemplates: ${loanTemplates.length}`);
    console.info(`  investmentTypes: ${investmentTypes.length}`);
    console.info(`  lenders: ${lenders.length}`);
    console.info(`  loans: ${loans.length}`);
    console.info(`  transactions: ${transactions.length}`);
    console.info(`  files: ${fileCount}`);
    console.info(`  notes: ${notes.length}`);
    console.info(`  changes: ${changes.length}`);
    console.info(`  views: ${views.length}`);
    console.info(`  templates: ${templates.length}`);
    console.info(`  predefinedBlocks: ${blocks.length}`);
    console.info(`  dashboardLayout: ${dashboardLayout ? 1 : 0}`);
    if (options.includeBank) {
      console.info(`  bankConnections: ${bankConnections.length}`);
      console.info(`  importedBankTransactions: ${importedBankTransactions.length}`);
      console.info(`  bankImportBatch: ${bankImportBatch ? 1 : 0}`);
      console.info(`  bankImportRows: ${bankImportRows.length}`);
    } else {
      console.info('  bank: skipped (pass --include-bank to copy)');
    }

    for (const plan of userPlans) {
      if (plan.action === 'reuse') {
        console.info(`  user ${plan.sourceId} (${plan.email ?? 'no-email'}) -> reuse ${plan.targetId}`);
      } else {
        console.info(
          `  user ${plan.sourceId} (${plan.email ?? 'no-email'}) -> create ${plan.targetId}${
            plan.conflictId ? ' (new id; source id taken)' : ''
          }`,
        );
      }
    }

    if (options.dryRun) {
      console.info('Dry run complete; no writes performed.');
      return;
    }

    const createPlanBySourceId = new Map(
      userPlans.filter((plan) => plan.action === 'create').map((plan) => [plan.sourceId, plan]),
    );

    await target.$transaction(
      async (tx) => {
        for (const user of usersToCreate) {
          const plan = createPlanBySourceId.get(user.id);
          if (plan?.action !== 'create') continue;

          await tx.user.create({
            data: {
              id: plan.targetId,
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
              language: user.language,
              password: user.password,
              image: user.image,
              isAdmin: false,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
          });
        }

        await tx.configuration.create({
          data: {
            id: configuration.id,
            name: configuration.name,
            logo: configuration.logo,
            email: configuration.email,
            telNo: configuration.telNo,
            website: configuration.website,
            street: configuration.street,
            addon: configuration.addon,
            zip: configuration.zip,
            place: configuration.place,
            country: configuration.country,
            iban: configuration.iban,
            bic: configuration.bic,
            userLanguage: configuration.userLanguage,
            lenderRequiredFields: configuration.lenderRequiredFields,
            lenderSalutation: configuration.lenderSalutation,
            lenderCountry: configuration.lenderCountry,
            interestMethod: configuration.interestMethod,
            altInterestMethods: configuration.altInterestMethods,
            defaultLoanTemplateId: configuration.defaultLoanTemplateId,
            lenderAdditionalFields: configuration.lenderAdditionalFields as Prisma.InputJsonValue,
            loanAdditionalFields: configuration.loanAdditionalFields as Prisma.InputJsonValue,
            deInvestmentActCompliance: configuration.deInvestmentActCompliance,
          },
        });

        await createManyChunked(
          (args) => tx.loanTemplate.createMany(args),
          loanTemplates.map((row) => ({
            id: row.id,
            configurationId: row.configurationId,
            name: row.name,
            isDefault: row.isDefault,
            terminationType: row.terminationType,
            terminationPeriod: row.terminationPeriod,
            terminationPeriodType: row.terminationPeriodType,
            duration: row.duration,
            durationType: row.durationType,
            endDate: row.endDate,
            minInterestRate: row.minInterestRate,
            maxInterestRate: row.maxInterestRate,
            minAmount: row.minAmount,
            maxAmount: row.maxAmount,
          })),
        );

        await tx.project.create({
          data: {
            id: project.id,
            slug: targetSlug,
            configurationId: configuration.id,
            managers: {
              connect: project.managers.map((manager) => ({
                id: remapUserId(userIdMap, manager.id),
              })),
            },
          },
        });

        await createManyChunked(
          (args) => tx.investmentType.createMany(args),
          investmentTypes.map((row) => ({
            id: row.id,
            projectId: row.projectId,
            interestRate: row.interestRate,
            limitationType: row.limitationType,
            name: row.name,
          })),
        );

        await createManyChunked(
          (args) => tx.lender.createMany(args),
          lenders.map((row) => ({
            id: row.id,
            lenderNumber: row.lenderNumber,
            projectId: row.projectId,
            type: row.type,
            salutation: row.salutation,
            firstName: row.firstName,
            lastName: row.lastName,
            organisationName: row.organisationName,
            titlePrefix: row.titlePrefix,
            titleSuffix: row.titleSuffix,
            street: row.street,
            addon: row.addon,
            zip: row.zip,
            place: row.place,
            country: row.country,
            telNo: row.telNo,
            email: row.email,
            iban: row.iban,
            bic: row.bic,
            notificationType: row.notificationType,
            additionalFields: jsonOrOmit(row.additionalFields),
          })),
        );

        await createManyChunked(
          (args) => tx.loan.createMany(args),
          loans.map((row) => ({
            id: row.id,
            loanNumber: row.loanNumber,
            lenderId: row.lenderId,
            signDate: row.signDate,
            terminationType: row.terminationType,
            endDate: row.endDate,
            terminationDate: row.terminationDate,
            terminationPeriod: row.terminationPeriod,
            terminationPeriodType: row.terminationPeriodType,
            duration: row.duration,
            durationType: row.durationType,
            isSavingsContract: row.isSavingsContract,
            savingsRateType: row.savingsRateType,
            savingsMonthlyAmount: row.savingsMonthlyAmount,
            savingsDepositCount: row.savingsDepositCount,
            savingsFirstDepositDate: row.savingsFirstDepositDate,
            savingsLastDepositDate: row.savingsLastDepositDate,
            amount: row.amount,
            interestRate: row.interestRate,
            interestPaymentType: row.interestPaymentType,
            altInterestMethod: row.altInterestMethod,
            contractStatus: row.contractStatus,
            investmentTypeId: row.investmentTypeId,
            additionalFields: jsonOrOmit(row.additionalFields),
          })),
        );

        await createManyChunked(
          (args) => tx.transaction.createMany(args),
          transactions.map((row) => ({
            id: row.id,
            loanId: row.loanId,
            type: row.type,
            date: row.date,
            amount: row.amount,
            paymentType: row.paymentType,
          })),
        );

        const fileIds = (
          await source.file.findMany({
            where: { lender: { projectId } },
            select: { id: true },
            orderBy: { id: 'asc' },
          })
        ).map((row) => row.id);

        for (const idBatch of chunk(fileIds, FILE_BATCH_SIZE)) {
          const files = await source.file.findMany({
            where: { id: { in: idBatch } },
          });
          for (const file of files) {
            await tx.file.create({
              data: {
                id: file.id,
                mimeType: file.mimeType,
                name: file.name,
                data: file.data,
                public: file.public,
                description: file.description,
                thumbnail: file.thumbnail,
                lenderId: file.lenderId,
                loanId: file.loanId,
                createdAt: file.createdAt,
                createdById: remapUserId(userIdMap, file.createdById),
              },
            });
          }
        }

        await createManyChunked(
          (args) => tx.note.createMany(args),
          notes.map((row) => ({
            id: row.id,
            text: row.text,
            public: row.public,
            lenderId: row.lenderId,
            loanId: row.loanId,
            createdById: remapUserId(userIdMap, row.createdById),
            createdAt: row.createdAt,
          })),
        );

        await createManyChunked(
          (args) => tx.change.createMany(args),
          changes.map((row) => ({
            id: row.id,
            primaryKey: row.primaryKey,
            projectId: row.projectId,
            before: row.before as Prisma.InputJsonValue,
            after: row.after as Prisma.InputJsonValue,
            context: row.context as Prisma.InputJsonValue,
            entity: row.entity,
            operation: row.operation,
            committedAt: row.committedAt,
          })),
        );

        await createManyChunked(
          (args) => tx.view.createMany(args),
          views.map((row) => ({
            id: row.id,
            userId: remapUserId(userIdMap, row.userId),
            type: row.type,
            name: row.name,
            data: row.data as Prisma.InputJsonValue,
            isDefault: row.isDefault,
            projectId: row.projectId,
            showInSidebar: row.showInSidebar,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
        );

        await createManyChunked(
          (args) => tx.communicationTemplate.createMany(args),
          templates.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            subjectOrFilename: row.subjectOrFilename,
            type: row.type,
            dataset: row.dataset,
            designJson: row.designJson as Prisma.InputJsonValue,
            htmlContent: row.htmlContent,
            isPublic: row.isPublic,
            isGlobal: row.isGlobal,
            isSystem: row.isSystem,
            systemKey: row.systemKey,
            projectId: row.projectId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdById: remapUserId(userIdMap, row.createdById),
          })),
        );

        await createManyChunked(
          (args) => tx.predefinedCraftBlock.createMany(args),
          blocks.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            designJson: row.designJson as Prisma.InputJsonValue,
            datasets: row.datasets,
            templateTypes: row.templateTypes,
            visibility: row.visibility,
            projectId: row.projectId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdById: remapUserId(userIdMap, row.createdById),
          })),
        );

        if (dashboardLayout) {
          await tx.dashboardLayout.create({
            data: {
              id: dashboardLayout.id,
              scope: dashboardLayout.scope,
              projectId: dashboardLayout.projectId,
              userId: null,
              layout: dashboardLayout.layout as Prisma.InputJsonValue,
              createdAt: dashboardLayout.createdAt,
              updatedAt: dashboardLayout.updatedAt,
            },
          });
        }

        if (options.includeBank) {
          await createManyChunked(
            (args) => tx.bankConnection.createMany(args),
            bankConnections.map((row) => ({
              id: row.id,
              projectId: row.projectId,
              requisitionId: row.requisitionId,
              reference: row.reference,
              institutionId: row.institutionId,
              institutionName: row.institutionName,
              institutionLogo: row.institutionLogo,
              status: row.status,
              agreementId: row.agreementId,
              accountIds: row.accountIds,
              accessExpiresAt: row.accessExpiresAt,
              lastImportedAt: row.lastImportedAt,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            })),
          );

          await createManyChunked(
            (args) => tx.importedBankTransaction.createMany(args),
            importedBankTransactions.map((row) => ({
              id: row.id,
              connectionId: row.connectionId,
              bankTransactionId: row.bankTransactionId,
              transactionId: row.transactionId,
              importedAt: row.importedAt,
            })),
          );

          if (bankImportBatch) {
            await tx.bankImportBatch.create({
              data: {
                id: bankImportBatch.id,
                projectId: bankImportBatch.projectId,
                connectionId: bankImportBatch.connectionId,
                accountId: bankImportBatch.accountId,
                lastFetchedAt: bankImportBatch.lastFetchedAt,
                createdAt: bankImportBatch.createdAt,
                updatedAt: bankImportBatch.updatedAt,
              },
            });

            await createManyChunked(
              (args) => tx.bankImportRow.createMany(args),
              bankImportRows.map((row) => ({
                id: row.id,
                batchId: row.batchId,
                bankTransactionId: row.bankTransactionId,
                bookingDate: row.bookingDate,
                valueDate: row.valueDate,
                amount: row.amount,
                currency: row.currency,
                counterpartyName: row.counterpartyName,
                counterpartyIban: row.counterpartyIban,
                remittanceInfo: row.remittanceInfo,
                raw: row.raw as Prisma.InputJsonValue,
                suggestedLenderId: row.suggestedLenderId,
                suggestedLoanId: row.suggestedLoanId,
                selectedLenderId: row.selectedLenderId,
                selectedLoanId: row.selectedLoanId,
                selectedType: row.selectedType,
              })),
            );
          }
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 60_000 },
    );

    console.info(`Copied project "${project.slug}" -> "${targetSlug}" successfully.`);
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error('Failed to copy project:', error);
  process.exitCode = 1;
});
