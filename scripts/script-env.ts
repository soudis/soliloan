/**
 * Env files for `pnpm script <name>`, later files overriding earlier ones:
 *
 *   .env
 *   scripts/.env
 *   scripts/.<name>.env
 *   the file passed with --env
 */
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnvFile } from 'dotenv';

const LOADED_MARKER = 'SOLILOAN_SCRIPT_ENV_LOADED';

export function scriptNameFromImportMeta(url: string): string {
  const fileName = basename(fileURLToPath(url));
  const extension = extname(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
}

export function envFileFromArgv(argv: string[]): string | null {
  let envFile: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--env') continue;
    const value = argv[++i];
    if (!value || value.startsWith('-')) {
      throw new Error('--env requires a path');
    }
    envFile = value;
  }

  return envFile;
}

function assertScriptName(scriptName: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(scriptName)) {
    throw new Error(`Invalid script name: ${scriptName}`);
  }
}

function applyEnvFile(envPath: string, optional: boolean, seen: Set<string>): boolean {
  const resolved = resolve(process.cwd(), envPath);
  if (seen.has(resolved)) return false;

  const result = loadEnvFile({ path: resolved, override: true, quiet: true });
  if (!result.error) {
    seen.add(resolved);
    return true;
  }

  const code = (result.error as NodeJS.ErrnoException).code;
  if (code === 'ENOENT' && optional) return false;
  if (code === 'ENOENT') {
    throw new Error(`Env file not found: ${envPath}`);
  }
  throw result.error;
}

/** Loads the script env cascade. Pass `envFile` to set --env explicitly; omit it to read --env from argv. */
export function loadScriptEnv(scriptName: string, envFile?: string | null): string[] {
  assertScriptName(scriptName);
  if (process.env[LOADED_MARKER] === scriptName) return [];

  const extraFile = envFile === undefined ? envFileFromArgv(process.argv.slice(2)) : envFile;
  const files = ['.env', 'scripts/.env', `scripts/.${scriptName}.env`];
  if (extraFile) files.push(extraFile);

  const seen = new Set<string>();
  const loaded: string[] = [];
  for (const [index, file] of files.entries()) {
    const optional = extraFile === undefined || extraFile === null || index < files.length - 1;
    if (applyEnvFile(file, optional, seen)) loaded.push(file);
  }

  process.env[LOADED_MARKER] = scriptName;
  if (loaded.length > 0) {
    console.info(`Loaded env from ${loaded.join(', ')}`);
  }
  return loaded;
}
