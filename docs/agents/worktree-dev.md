# Dev environment per git worktree

Run and test your branch in its own docker stack, without touching the primary checkout's stack or another worktree. Everything is driven by `scripts/worktree-dev.sh`, run **from inside the worktree**. In the primary checkout keep using `pnpm docker:dev up`.

## Quick start

```bash
git worktree add .claude/worktrees/<name> -b <type>/<issue>-<slug> main
cd .claude/worktrees/<name>
scripts/worktree-dev.sh up        # first start takes minutes: pnpm install, db push, seed, next dev
scripts/worktree-dev.sh url       # print URLs again later
```

`up` prints:

| | Example |
| --- | --- |
| App | `https://<slug>.soliloan.localhost` (slug = branch name, e.g. `fix-222-payment-checks`) |
| MCP | `http://127.0.0.1:<free port>/_next/mcp` (for `next-devtools-mcp` / `next-dev-loop`) |
| Mailpit | `http://127.0.0.1:<free port>` (all mails of this stack) |
| Admin | `SOLILOAN_ADMIN_EMAIL` / `SOLILOAN_ADMIN_PASSWORD` from the worktree's `.env` |

Drive the browser (`agent-browser`) at the app URL, never at the MCP port: auth cookies and `NEXTAUTH_URL` are bound to the `*.soliloan.localhost` host. The browser must trust the mkcert certificate (same as the primary stack).

## Commands

| Command | Does |
| --- | --- |
| `up [slug]` | write `.env`, ensure shared Traefik, `docker compose up -d --build`, wait until the app answers |
| `url` | print app, MCP, Mailpit, admin |
| `logs [service]` | follow logs, default `app` |
| `exec <cmd...>` | run in the app container: `exec pnpm test`, `exec pnpm typecheck`, `exec pnpm prisma migrate dev --name <slug>` |
| `down` | remove containers, network, **database volume**, and the root-owned `.next`, `.pnpm-store`, `prisma/generated` |

Always `down` before `git worktree remove` (the container runs as root and writes those directories into the worktree, which blocks deleting it).

## What is isolated, what is shared

- **Per worktree** (compose project `soliloan-<slug>`): containers, backend network, Postgres volume (own schema + seed, no published 5432), Mailpit, `.next`, `node_modules` (anonymous volume, so the first start installs again).
- **Shared**: one Traefik (project `soliloan-traefik`, network `soliloan_traefik_network`) routes every stack by `Host(<slug>.soliloan.localhost)`. It is started by the first `up` and stays up after `down`. It uses the gitignored mkcert wildcard certificate `*.soliloan.localhost` from the **primary checkout** (`docker/traefik/certs/`).
- **`.env`**: a fresh worktree has none, so `up` copies the primary checkout's `.env` (or `.env.example`) and sets `COMPOSE_PROJECT_NAME`, `TRAEFIK_HOST`, `TRAEFIK_ROUTER_NAME`, `NEXTAUTH_URL`, `SOLILOAN_URL`. Re-running `up` re-applies those and keeps your other edits.

## Troubleshooting

- **Ports 80/443 busy**: another reverse proxy owns them. Stop it, or use the stack that already runs Traefik. If the primary stack (`pnpm docker:dev up`) is running, its Traefik is reused. The reverse (starting the primary stack while the shared Traefik runs) fails on the ports: stop the shared one first with `docker compose -p soliloan-traefik down`.
- **Primary stack and 5432**: the primary stack publishes Postgres on 5432; worktree stacks do not, so they never clash with it or with other local databases.
- **Start timeout**: `up` waits 10 minutes (`WORKTREE_DEV_WAIT_SECONDS`). On timeout it prints the app log; `scripts/worktree-dev.sh logs` follows it.
- **Host tools** (`pnpm typecheck` on the host) need `pnpm install` in the worktree; or use `exec` and skip host `node_modules`.
- **Compose files**: `docker/compose.worktree.yml` reuses the base/dev modules of `docker/postgres` and `docker/app` and layers `docker/worktree/*.yml` on top (published ports dropped or made dynamic). Change shared behaviour in the base/dev modules, not there.
