/**
 * Backfill fields on already-migrated Soliloan projects from a dkp-v1 data package.
 *
 * Usage (from repo root, after `pnpm prisma:generate`):
 *
 *   pnpm script backfill-after-migration interestPaymentType
 *   pnpm script backfill-after-migration interestPaymentType --dry-run
 *   pnpm script backfill-after-migration interestPaymentType --slug my-project
 *
 * Env (later overrides earlier):
 *
 *   .env
 *   scripts/.env
 *   scripts/.backfill-after-migration.env
 *   --env <path>
 *
 *   TARGET_DATABASE_URL=postgresql://...
 *   MIGRATION_BASE_URL=https://old-dkp.example.com
 *   MIGRATION_ACCESS_TOKEN=...
 */
import { rm } from 'node:fs/promises';

import { PrismaPg } from '@prisma/adapter-pg';
import { InterestPaymentType, PrismaClient } from '@prisma/client';

import { fetchAndExtractDataPackage } from '@/lib/migration/import';
import { mapInterestPaymentType, parseInterestPaymentType } from '@/lib/migration/mapping';
import type { MigrationWarning } from '@/lib/migration/types';
import { loadScriptEnv, scriptNameFromImportMeta } from './script-env';

const TRANSACTION_TIMEOUT_MS = 10 * 60 * 1000;

type GlobalOptions = {
  command: string | null;
  dryRun: boolean;
  slug: string | null;
  help: boolean;
};

type InterestPaymentTypeChange = {
  loanNumber: number;
  loanId: string;
  from: InterestPaymentType;
  to: InterestPaymentType;
};

function printHelp() {
  console.info(`Backfill fields on already-migrated projects from a dkp-v1 data package.

Usage:
  pnpm script backfill-after-migration <command> [options]

Commands:
  interestPaymentType     Set Loan.interestPaymentType from dkp contract.interest_payment_type

Options:
  --slug <slug>           Target project slug (default: projectid from the data package)
  --dry-run               Print planned updates; do not write
  --env <path>            Env file applied after .env, scripts/.env, and
                          scripts/.backfill-after-migration.env
  --help                  Show this help
`);
}

function parseArgs(argv: string[]): GlobalOptions {
  const options: GlobalOptions = {
    command: null,
    dryRun: false,
    slug: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--slug') {
      options.slug = argv[++i] ?? '';
    } else if (arg === '--env') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('--env requires a path');
      }
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else if (options.command === null) {
      options.command = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

function createClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function runInterestPaymentTypeBackfill(options: GlobalOptions) {
  loadScriptEnv(scriptNameFromImportMeta(import.meta.url));
  const targetUrl = requireEnv('TARGET_DATABASE_URL');
  const baseUrl = requireEnv('MIGRATION_BASE_URL');
  const accessToken = requireEnv('MIGRATION_ACCESS_TOKEN');

  console.info(`Fetching data package from ${baseUrl} ...`);

  const { tempDir, data, projectInfo } = await fetchAndExtractDataPackage(baseUrl, accessToken);

  try {
    const slug = options.slug || projectInfo.projectid;
    if (!slug) {
      throw new Error('No project slug: pass --slug or ensure project.json has projectid');
    }

    const target = createClient(targetUrl);

    try {
      await target.$queryRawUnsafe('SELECT 1');

      const project = await target.project.findUnique({
        where: { slug },
        select: { id: true, slug: true },
      });
      if (!project) {
        throw new Error(`Target project not found for slug "${slug}"`);
      }

      const loans = await target.loan.findMany({
        where: { lender: { projectId: project.id } },
        select: { id: true, loanNumber: true, interestPaymentType: true },
      });

      const loansByNumber = new Map(loans.map((loan) => [loan.loanNumber, loan]));
      const matchedLoanNumbers = new Set<number>();
      const warnings: MigrationWarning[] = [];
      const changes: InterestPaymentTypeChange[] = [];
      let alreadyCorrect = 0;
      let contractsWithoutLoan = 0;

      const defaultInterestPaymentType =
        parseInterestPaymentType(projectInfo.defaults?.interest_payment_type) ?? InterestPaymentType.END;

      for (const contract of data.contract) {
        const loan = loansByNumber.get(contract.id);
        if (!loan) {
          contractsWithoutLoan++;
          warnings.push({
            entity: 'contract',
            legacyId: contract.id,
            message: `Kein Loan mit loanNumber ${contract.id} im Projekt "${slug}"`,
          });
          continue;
        }

        matchedLoanNumbers.add(loan.loanNumber);

        const mapped = mapInterestPaymentType(
          contract.interest_payment_type,
          defaultInterestPaymentType,
          warnings,
          contract.id,
        );

        if (loan.interestPaymentType === mapped) {
          alreadyCorrect++;
          continue;
        }

        changes.push({
          loanNumber: loan.loanNumber,
          loanId: loan.id,
          from: loan.interestPaymentType,
          to: mapped,
        });
      }

      const loansWithoutContract = loans.filter((loan) => !matchedLoanNumbers.has(loan.loanNumber)).length;

      console.info(`Project: ${project.slug} (${project.id})`);
      console.info(`Contracts in package: ${data.contract.length}`);
      console.info(`Loans in project: ${loans.length}`);
      console.info(`Would update: ${changes.length}`);
      console.info(`Already correct: ${alreadyCorrect}`);
      console.info(`Contracts without loan: ${contractsWithoutLoan}`);
      console.info(`Loans without contract: ${loansWithoutContract}`);

      if (changes.length > 0) {
        console.info('Changes (loanNumber: from -> to):');
        for (const change of changes) {
          console.info(`  ${change.loanNumber}: ${change.from} -> ${change.to}`);
        }
      }

      if (warnings.length > 0) {
        console.info(`Warnings (${warnings.length}):`);
        for (const warning of warnings) {
          const idPart = warning.legacyId !== null ? ` #${warning.legacyId}` : '';
          console.info(`  [${warning.entity}${idPart}] ${warning.message}`);
        }
      }

      if (options.dryRun) {
        console.info('Dry run — no writes.');
        return;
      }

      if (changes.length === 0) {
        console.info('Nothing to update.');
        return;
      }

      await target.$transaction(
        async (tx) => {
          for (const change of changes) {
            await tx.loan.update({
              where: { id: change.loanId },
              data: { interestPaymentType: change.to },
            });
          }
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      );

      console.info(`Updated ${changes.length} loan(s).`);
    } finally {
      await target.$disconnect();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  let options: GlobalOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help || !options.command) {
    printHelp();
    if (!options.help && !options.command) {
      process.exitCode = 1;
    }
    return;
  }

  if (options.command === 'interestPaymentType') {
    await runInterestPaymentTypeBackfill(options);
    return;
  }

  console.error(`Unknown command: ${options.command}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
