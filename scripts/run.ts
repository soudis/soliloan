/**
 * Run a script from scripts/.
 *
 *   pnpm script <name> [args...]
 *
 * Env files (later overrides earlier):
 *   .env
 *   scripts/.env
 *   scripts/.<name>.env
 *   --env <path>
 */
import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { envFileFromArgv, loadScriptEnv } from './script-env';

const RESERVED_SCRIPTS = new Set(['run', 'script-env']);

type RunnerArgs = {
  help: boolean;
  name: string | null;
  scriptArgs: string[];
};

function printHelp(scripts: string[]) {
  const listing = scripts.length > 0 ? scripts.map((name) => `  ${name}`).join('\n') : '  (none)';
  console.info(`Run a TypeScript script from scripts/.

Usage:
  pnpm script <name> [args...]

Examples:
  pnpm script download-migration-data ./tmp/dkp-export
  pnpm script copy-project --slug my-project --env scripts/.copy-project.prod-to-local-dev.env

Env files (later overrides earlier):
  .env
  scripts/.env
  scripts/.<name>.env
  --env <path>

Scripts:
${listing}
`);
}

function parseRunnerArgs(argv: string[]): RunnerArgs {
  let name: string | null = null;
  const scriptArgs: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--env') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('--env requires a path');
      }
      scriptArgs.push('--env', value);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      if (name === null) {
        return { help: true, name: null, scriptArgs: [] };
      }
      scriptArgs.push(arg);
      continue;
    }
    if (name === null && !arg.startsWith('-')) {
      name = arg.endsWith('.ts') ? arg.slice(0, -3) : arg;
      continue;
    }
    scriptArgs.push(arg);
  }

  return { help: false, name, scriptArgs };
}

async function listScripts(): Promise<string[]> {
  const entries = await readdir(resolve(process.cwd(), 'scripts'));
  return entries
    .filter((entry) => entry.endsWith('.ts') && !RESERVED_SCRIPTS.has(entry.slice(0, -3)))
    .map((entry) => entry.slice(0, -3))
    .sort();
}

function tsxCliPath(): string {
  const require = createRequire(import.meta.url);
  return resolve(dirname(require.resolve('tsx/package.json')), 'dist/cli.mjs');
}

function runScript(scriptPath: string, scriptArgs: string[]): Promise<number> {
  return new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [tsxCliPath(), scriptPath, ...scriptArgs], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => resolveExit(code ?? 1));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--') argv.shift();

  const options = parseRunnerArgs(argv);
  const scripts = await listScripts();

  if (options.help || !options.name) {
    printHelp(scripts);
    if (!options.help) process.exitCode = 1;
    return;
  }

  if (!scripts.includes(options.name)) {
    console.error(`Unknown script: ${options.name}`);
    printHelp(scripts);
    process.exitCode = 1;
    return;
  }

  const scriptPath = resolve(process.cwd(), 'scripts', `${options.name}.ts`);
  await access(scriptPath);
  const asksForHelp = options.scriptArgs.includes('--help') || options.scriptArgs.includes('-h');
  if (!asksForHelp) {
    loadScriptEnv(options.name, envFileFromArgv(options.scriptArgs));
  }

  const exitCode = await runScript(scriptPath, options.scriptArgs);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
