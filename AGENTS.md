<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

Soliloan manages direct-credit projects (crowdinvesting): Kreditgeber\*innen, Kredite, Zahlungen, notes and files, multi-tenant per project with admin / manager / lender roles. Stack: Next.js (App Router), TypeScript, Prisma + PostgreSQL, Tailwind, shadcn/ui, next-intl.

- Language: read [GLOSSARY.md](GLOSSARY.md) and the relevant [ADRs](docs/adr/) before naming or changing domain behaviour. Use the glossary terms in code, tickets and PRs.
- Before a PR: `pnpm verify` (typecheck, lint, format, test). Never commit `.env` or other secrets.
- The predecessor app [habidat-direktkredit](https://github.com/soudis/habidat-direktkredit) is a read-only reference: look it up only when a ticket or the user refers to legacy behaviour, never copy code ([workflow.md](docs/agents/workflow.md#legacy-app)).

## Workflow

Ticket → board → branch → develop → verify → review → PR to `main`. Full steps: [docs/agents/workflow.md](docs/agents/workflow.md).

- **Ticket** (only when asked, show the draft first): `gh issue create`, imperative English title, label `bug|enhancement|documentation` (+ `discuss`), body Problem / Desired behaviour / Acceptance criteria. It must land on the project board at least in **Ready**: `scripts/board-status.sh <n> ready|in-progress|in-review|done`. See [issue-tracker.md](docs/agents/issue-tracker.md).
- **Branch**: `<type>/<issue>-<slug>` off `main`, type `feat|fix|chore|docs|refactor|ci`, e.g. `fix/222-payment-checks`.
- **Commit / PR title**: Conventional Commit with the issue number, e.g. `fix(savings): #232 correct the monthly amount`. PR body from the template, always ending with `Closes #<n>`, even if the PR only does part of the ticket (reopening it is then a manual duty). Base is `main`.
- **Git**: never push to `main`. Merging into `staging` (which deploys on push) only when the user asks, and say so first.
- **Schema change** in `prisma/schema.prisma` needs a migration in `prisma/migrations`.

## Agent skills

Installed in `.agents/skills/` (`.claude/skills` is a symlink to it), tracked in `skills-lock.json`.

- `grill-with-docs` (with `grilling`, `domain-modeling`): stress-test a plan, record terms in `GLOSSARY.md` and decisions in `docs/adr/`. Reads [docs/agents/domain.md](docs/agents/domain.md).
- `code-review-matt`: review a branch against standards and the ticket. Upstream name is `code-review`; renamed locally to avoid the built-in command, so re-apply the rename after `npx skills update`. Reads [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).
- `handoff`: summary for a fresh agent, written to `/tmp`.
- `next-dev-loop`: verify a change in the running app. `caveman`: terse replies.

## Docker development (host vs container)

The documented workflow is `pnpm docker:dev up`, not host `pnpm dev`. Next.js runs inside the `app` container (`WORKDIR /app`). Keep these surfaces distinct:

- **Browser / `agent-browser`:** `https://soliloan.localhost` (Traefik). Auth cookies and `NEXTAUTH_URL` are bound to that host. Do not drive the UI at `http://localhost:3000`.
- **Next.js MCP** (`/_next/mcp`, `next-devtools-mcp`, `next-dev-loop` probes): `http://localhost:3000/_next/mcp`. Compose publishes container port 3000 to host loopback so auto-discovery works. If the probe is unreachable, Docker is not up (or port 3000 is taken) — do not assume Next.js is below 16.3.
- **Workspace paths:** MCP tools such as `get_logs` and `get_project_metadata` return container paths under `/app`. Map `/app/...` to the same path under this repository root. `.next` is bind-mounted; `node_modules` is not (anonymous volume).
- **Worktrees:** one isolated stack per git worktree (own database, own URL `https://<slug>.soliloan.localhost`, free MCP port) via `scripts/worktree-dev.sh up|url|exec|logs|down`. In a worktree use it instead of `pnpm docker:dev`; see [worktree-dev.md](docs/agents/worktree-dev.md).
- **Bundled docs:** Agents read `node_modules/next/dist/docs/` on the host. Run `pnpm install` on the host so that tree exists; the container's `node_modules` is not visible here.

## Server actions vs server-only code

`src/actions` holds only `'use server'` safe-actions that client components call; server-only code lives in `src/lib/<domain>/` with `import 'server-only'`. Functions that trust their caller to have checked access end in `Unsafe`. See [ADR 0004](docs/adr/0004-actions-are-client-callable-safe-actions.md).
