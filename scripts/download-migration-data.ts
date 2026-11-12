/**
 * Download a dkp-v1 migration data package for inspection.
 *
 * Usage (from repo root, after `pnpm prisma:generate`):
 *
 *   pnpm script download-migration-data ./tmp/dkp-export
 *   pnpm script download-migration-data ./tmp/dkp-export --env path/to/other.env
 *
 * Env (later overrides earlier):
 *
 *   .env
 *   scripts/.env
 *   scripts/.download-migration-data.env
 *   --env <path>
 *
 *   MIGRATION_BASE_URL=https://old-dkp.example.com
 *   MIGRATION_ACCESS_TOKEN=...
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { fetchAndExtractDataPackage } from '@/lib/migration/import';
import { loadScriptEnv, scriptNameFromImportMeta } from './script-env';

type Options = {
  targetDir: string | null;
  help: boolean;
};

function printHelp() {
  console.info(`Download a dkp-v1 migration data package and extract it for inspection.

Usage:
  pnpm script download-migration-data <target-dir> [options]

Arguments:
  <target-dir>            Directory to write the extracted package into (required).
                          Created if missing. Must be empty when it already exists.

Options:
  --env <path>            Env file applied after .env, scripts/.env, and
                          scripts/.download-migration-data.env
  --help                  Show this help
`);
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    targetDir: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--env') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('--env requires a path');
      }
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else if (options.targetDir === null) {
      options.targetDir = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function assertEmptyTarget(targetDir: string) {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new Error(`Target is not a directory: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const entries = await readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

async function downloadPackage(targetDir: string) {
  loadScriptEnv(scriptNameFromImportMeta(import.meta.url));
  const baseUrl = requireEnv('MIGRATION_BASE_URL');
  const accessToken = requireEnv('MIGRATION_ACCESS_TOKEN');
  const resolvedTarget = resolve(process.cwd(), targetDir);

  await assertEmptyTarget(resolvedTarget);

  console.info(`Fetching data package from ${baseUrl} ...`);

  const { tempDir, data, projectInfo } = await fetchAndExtractDataPackage(baseUrl, accessToken);

  try {
    await mkdir(resolvedTarget, { recursive: true });
    await cp(tempDir, resolvedTarget, { recursive: true });

    const entries = (await readdir(resolvedTarget)).sort();

    console.info(`Project: ${projectInfo.projectname} (${projectInfo.projectid})`);
    console.info(`Admins: ${data.admin?.length ?? 0}`);
    console.info(`Users: ${data.user.length}`);
    console.info(`Contracts: ${data.contract.length}`);
    console.info(`Transactions: ${data.transaction.length}`);
    console.info(`Files: ${data.file?.length ?? 0}`);
    console.info(`Wrote ${entries.length} entries to ${resolvedTarget}`);
    for (const entry of entries) {
      console.info(`  ${entry}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help || !options.targetDir) {
    printHelp();
    if (!options.help) {
      process.exitCode = 1;
    }
    return;
  }

  await downloadPackage(options.targetDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
