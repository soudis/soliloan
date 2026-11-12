# Workflow: ticket to merged PR

Every change starts from a ticket and ends in a PR to `main`. Skills named here live in `.agents/skills/` (see AGENTS.md).

1. **Ticket**: find or create it, [issue-tracker.md](issue-tracker.md). Vague idea? `grill-with-docs` first; it records terms in `GLOSSARY.md` and decisions in `docs/adr/`.
2. **Board**: `scripts/board-status.sh <n> in-progress`.
3. **Branch** from up-to-date `main` (never from `staging`).
4. **Develop** in small commits. For something to run and click through, start an isolated stack: [worktree-dev.md](worktree-dev.md).
5. **Verify**: `pnpm verify` (typecheck, lint, format, tests) must pass. For UI or server-action changes also check it in the running app (`next-dev-loop` skill).
6. **Review** your own diff with `code-review-matt` against `main` before opening the PR.
7. **PR** to `main`, then `scripts/board-status.sh <n> in-review`.

## Naming

| What | Convention | Example |
| --- | --- | --- |
| Branch | `<type>/<issue>-<kebab-slug>` | `fix/222-payment-checks` |
| Commit | Conventional Commit, issue number after the colon | `fix(savings): #232 correct the monthly amount` |
| PR title | same shape as the commit | `chore: #257 bump dependencies and upgrade Faker` |
| PR body | filled `.github/pull_request_template.md`, ends with `Closes #<n>` | |

- `<type>` is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `ci`. Use `feat/`, not `feature/` (older branches do).
- Scope in parentheses is optional; lowercase, imperative summary, no trailing period.
- One ticket, one branch, one PR.
- **A PR is always linked to its ticket, and always with `Closes #<n>`.** Put `#<n>` in the title and `Closes #<n>` in the body, also when the PR only does part of the ticket. Never use `Refs`: it only creates a cross-reference in the timeline, while a closing reference fills the "Development" link and the board's "Linked pull requests". (The manual link of the Development sidebar, or the `addCloseIssueReferences` GraphQL mutation, is a closing reference as well, so it gains nothing.)
- Merging closes the ticket even if work is left. Reopening it, or filing a follow-up ticket, is a manual duty of the humans; do not work around it. If a PR is only part of a ticket, say so in the PR description (e.g. "Partial: the `sol-*` skills are still open") so the reviewer reopens the ticket after the merge.
- After `gh pr create`, check the link: `gh pr view --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]'` must contain the ticket number.

## Git rules

- Base of every PR is `main`. Agents never push to `main`.
- `staging` deploys on every push (`.github/workflows/staging.yml`). An agent merges a branch into `staging` and pushes **only when the user asks**, and says that this deploys before doing it.
- Never force-push a shared branch, never skip hooks, never commit `.env` or other secrets.

## Database changes

When `prisma/schema.prisma` changes, also create a migration: `pnpm prisma:migrate:dev --name <slug>` in the primary stack, or `scripts/worktree-dev.sh exec pnpm prisma migrate dev --name <slug>` in a worktree stack (Postgres is not published there). Commit the new folder in `prisma/migrations/`. The dev containers use `prisma db push`, so a missing migration is not noticed locally but breaks staging and production.

## Legacy app

The predecessor app is [habidat-direktkredit](https://github.com/soudis/habidat-direktkredit). Look at it read-only (`gh repo view`, `gh api`, or browse) only when a ticket or the user refers to legacy behaviour, a migration, or "how the old app did X". Never copy code from it; its terms may differ from `GLOSSARY.md`.

## Handing over

`handoff` writes a summary for a fresh agent to `/tmp` (not into the repo). Use it when the context gets long or the work moves to another session or worktree. It must reference tickets, PRs and ADRs by link instead of repeating them, and contain no secrets.
