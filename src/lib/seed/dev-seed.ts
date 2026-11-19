// Used by prisma/seed.ts (run with tsx, outside Next.js), so no `server-only` import here.

type SeedEnv = Record<string, string | undefined>;

/** Same values as `.env.example`, so a dev stack whose `.env` predates the keys still gets the account. */
export const DEV_AGENT_DEFAULT_EMAIL = 'agent@dev.local';
export const DEV_AGENT_DEFAULT_PASSWORD = 'agent-dev-password';

/**
 * True only for a local dev stack: `ENVIRONMENT=dev` and `NODE_ENV` not `production`.
 * The staging, demo and production images run the seed with `NODE_ENV=production`,
 * so demo data and the agent account can never land there, even with a wrong `ENVIRONMENT`.
 */
export function isDevSeed(env: SeedEnv): boolean {
  return env.ENVIRONMENT === 'dev' && env.NODE_ENV !== 'production';
}

/** The agent admin account's login, from `SOLILOAN_DEV_AGENT_EMAIL` / `SOLILOAN_DEV_AGENT_PASSWORD`. */
export function devAgentCredentials(env: SeedEnv): { email: string; password: string } {
  return {
    email: env.SOLILOAN_DEV_AGENT_EMAIL || DEV_AGENT_DEFAULT_EMAIL,
    password: env.SOLILOAN_DEV_AGENT_PASSWORD || DEV_AGENT_DEFAULT_PASSWORD,
  };
}
