# Workflow: ticket to merged PR

**In short:** every change has a ticket, a lane and one PR to `main`. Start with
`/soliloan-start <ticket or sentence>`; it sizes the lane and sets up ticket, branch, board and
dev stack. Open the PR, then run `/soliloan-review`. Risk-list changes and lane L wait for a
teammate's approval. Skills live in `.agents/skills/` ([README](../../.agents/skills/README.md)).

## Steps

1. **Ticket**: find or create it, [issue-tracker.md](issue-tracker.md). Every PR has one, except
   dependency bumps. Vague idea? `/grill-with-docs` first.
2. **Lane**: S, M or L, see [Lanes](#lanes). `/soliloan-start` does steps 1 to 4.
3. **Board**: `scripts/board-status.sh <n> in-progress`.
4. **Branch** from up-to-date `main` (never from `staging`). On a `claude/…` worktree branch,
   rename it with `git branch -m <branch>` before the first commit.
5. **Develop** in small commits. To run and click through it: [worktree-dev.md](worktree-dev.md).
6. **Verify**, see [Verification](#verification).
7. **PR** to `main`, then `scripts/board-status.sh <n> in-review`.
8. **Review**: `/soliloan-review` in the authoring session, then fix what it decided.
9. **Merge** after the approvals the lane needs; the ticket moves to `done`.

## Lanes

`scripts/pr-size.sh` counts changed lines against `origin/main`, without the lockfile,
migrations, vendored skills, generated and moved code, and lists the risk-list paths touched.
Before the work starts, `/soliloan-start` estimates the same from a scout.

| Lane | When | Before coding | Review | Merge |
| --- | --- | --- | --- | --- |
| **S** | up to ~150 lines, no decisions left after the setup round; dependency bumps (`--mechanical`) | confirm lane, ticket, branch | `code-review` | self-merge after review |
| **M** | ~150 to 800 lines, or open decisions inside existing ADRs and terms | `grilling` on the open decisions | `code-review` + `code-review-docs` | self-merge after review |
| **L** | over 800 lines, a [risk-list](risk-list.md) path or behaviour, a new `…Unsafe` call, a schema or calculation change, or a decision that changes an ADR or glossary term | `/grill-with-docs` (records terms and ADRs) | + `security-review` | a teammate approves |

Decisions settled in the setup round of `/soliloan-start` do not raise the lane, unless they
touch an ADR, a glossary term, the schema or a calculation (then L).

The lane only goes up: when `pr-size.sh` shows a bigger lane than planned, say so in the PR and
review at the bigger lane.

## PR size

Keep PRs reviewable in one sitting: aim for under ~800 counted lines. Split when the work has
parts that can merge alone, for example a schema change and its migration before the UI that
uses it, or a refactor before the feature. Each part gets its own PR against `main` with
`Closes #<n>` on the last one and a "Partial" note on the others (see [Naming](#naming)). Do not
mix a dependency bump or a mass reformat with behaviour changes.

## Verification

- **Always**: `pnpm verify` (ADR numbers, typecheck, lint, format, tests) passes. In Claude
  Code the hooks in `.claude/settings.json` already run Biome on each edit and `pnpm typecheck`
  at the end of a turn; `pnpm verify` is still the gate.
- **Logic** (calculations, Exporte, filters): a test next to the code (`*.test.ts`), written
  first where it fits (`tdd`). CI runs the tests in `Europe/Berlin` and `UTC`.
- **UI or server actions**: check it in the running app with `next-dev-loop` against the dev
  stack ([worktree-dev.md](worktree-dev.md)); screenshots for visible changes.
- **Schema**: the migration applies to a fresh database, see [Database changes](#database-changes).

The evidence (command output, screenshots, the test that failed before) goes into the PR body's
Evidence section.

## Review

`/soliloan-review` runs the reviewers of the lane as fresh sub-agents, so the session that wrote
the code never grades its own work. It verifies each finding against the code, triages them with
you (fix now, change the ticket, follow-up ticket, reject), and posts one comment on the PR. Fix
the "fix now" findings on the branch, run `pnpm verify`, push.

A teammate's approval before merge is needed for lane L and every risk-list change. It is
agreed here, not enforced by branch protection. Ask in the PR and say what to look at.

## Parallel work

Several agents can work at once, each in its own git worktree with its own dev stack
(`scripts/worktree-dev.sh up`, own database and URL). Rules:

- One ticket, one worktree, one branch. Two sessions never edit the same files.
- `/soliloan-start` lists open PRs that touch the same files; agree on an order before starting.
- Merge `main` into a long-running branch when another PR lands in the same area.

## Naming

| What | Convention | Example |
| --- | --- | --- |
| Branch | `<type>/<issue>-<kebab-slug>` | `fix/222-payment-checks` |
| Commit | Conventional Commit, issue number after the colon | `fix(savings): #232 correct the monthly amount` |
| PR title | same shape as the commit | `chore: #257 bump dependencies and upgrade Faker` |
| PR body | filled `.github/pull_request_template.md`, ends with `Closes #<n>` | |

- `<type>` is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `ci`. Use `feat/`, not `feature/` (older branches do).
- Scope in parentheses is optional; lowercase, imperative summary, no trailing period.
- One ticket, one branch, one PR, unless the PR is split (see [PR size](#pr-size)).
- **A PR is always linked to its ticket, and always with `Closes #<n>`.** Put `#<n>` in the title and `Closes #<n>` in the body, also when the PR only does part of the ticket. Never use `Refs`: it only creates a cross-reference in the timeline, while a closing reference fills the "Development" link and the board's "Linked pull requests".
- Merging closes the ticket even if work is left. Reopening it, or filing a follow-up ticket, is a manual duty of the humans; do not work around it. If a PR is only part of a ticket, say so in the PR description (e.g. "Partial: the Kontomitteilungen export is still open") so the reviewer reopens the ticket after the merge.
- After `gh pr create`, check the link: `gh pr view --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` must contain the ticket number.
- The PR body follows the template; the `pr` skill shows how to write its Summary (diagrams, call trees) and Evidence (before and after).

## Git rules

- Base of every PR is `main`. Agents never push to `main`.
- `staging` deploys on every push (`.github/workflows/staging.yml`). It is rebuilt, never merged into, see [Staging](#staging). An agent runs `scripts/staging-rebuild.sh` without `--dry-run` **only when the user asks**, and says that this deploys before doing it.
- Never force-push a shared branch (the one exception is the rebuild script's lease-protected push of `staging`), never skip hooks, never commit `.env` or other secrets.

## Staging

`staging` is `main` plus every open PR labelled `on-staging`, rebuilt from scratch by `scripts/staging-rebuild.sh`. Do not merge a branch into `staging` by hand: the next rebuild drops it.

- **Put a PR on staging**: `gh pr edit <n> --add-label on-staging`, then rebuild. Remove the label to take it off; merged or closed PRs drop out by themselves. The first pushing run creates the label.
- **Rebuild**: `scripts/staging-rebuild.sh --dry-run` shows the result and pushes nothing; without the flag it pushes, which deploys. In a temporary worktree (your checkout stays as it is) it starts from `origin/main`, merges the labelled PRs oldest first with `--no-ff`, runs `pnpm verify`, and warns about migrations the old staging applied that are now removed, renamed or changed. Then one atomic push: the old staging to `backup/staging-<UTC time>` (the newest 5 are kept) and the new one with `--force-with-lease`. It prints the deploy run. When someone pushed `staging` in between, the push is refused: run it again.
- **A PR conflicts with `main`**: the run stops. Merge `main` into the PR's branch, then rebuild.
- **Two labelled PRs conflict**: the run stops in its worktree and prints the path. Resolve the files there, `git add` them, run `scripts/staging-rebuild.sh --continue` (or `--abort`). The merge commit gets a `Staging-Resolved:` trailer, and both PRs get a comment naming that commit and the files. Later rebuilds replay the resolution on any machine (git rerere, learned from the old staging's trailers). **The PR that merges into `main` second repeats the resolution** when it merges `main` into its branch: `git show <commit>` shows it.
- **Migration warning**: Prisma records applied migrations by folder name, so the staging database keeps a removed migration, runs a renamed one again and does not rerun a changed one. Check the staging database after the deploy.

## Database changes

When `prisma/schema.prisma` changes, also create a migration: `pnpm prisma:migrate:dev --name <slug>` in the primary stack, or `scripts/worktree-dev.sh exec pnpm prisma migrate dev --name <slug>` in a worktree stack (Postgres is not published there). Commit the new folder in `prisma/migrations/`. The dev containers use `prisma db push`, so a missing migration is not noticed locally but breaks staging and production.

## ADR numbers

Each ADR in `docs/adr/` has its own number; `pnpm verify` fails when two share one. Parallel
branches can pick the same next number, so when you merge `main` into your branch, renumber
your branch's ADRs past `main`'s highest (`git mv`, then fix the links to them). Gaps left
behind are fine.

## Legacy app

The predecessor app is [habidat-direktkredit](https://github.com/soudis/habidat-direktkredit). Look at it read-only (`gh repo view`, `gh api`, or browse) only when a ticket or the user refers to legacy behaviour, a migration, or "how the old app did X". Never copy code from it; its terms may differ from `GLOSSARY.md`.

## Handing over

`/handoff` writes a summary for a fresh agent to `/tmp` (not into the repo). Use it when the context gets long or the work moves to another session or worktree. It must reference tickets, PRs and ADRs by link instead of repeating them, and contain no secrets.

## For people: working with agents here

- **Setup once**: `pnpm install` on the host (the hooks and the Next.js docs need `node_modules`),
  `gh auth refresh -s project` (board scripts), and delete personal copies of the repo's skills
  in `~/.claude/skills/`: a personal skill with the same name wins over the repo's.
- **Daily**: type `/soliloan-start <ticket>` and answer its questions; it tells you when to type
  the next command (`/grill-with-docs` for L, `/soliloan-review` after the PR).
- **Cursor** reads `AGENTS.md` and `.agents/skills/` directly; it has no hooks, so run
  `pnpm verify` yourself. CI runs typecheck, lint, format and tests on every PR.
- **Changing the workflow**: edit this file, `AGENTS.md` or the `soliloan-*` skills in a PR like
  any other change. The vendored skills are updated as described in the skills README.
