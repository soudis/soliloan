# Coding standards

Judgement rules: the ones no linter checks. `code-review-docs` reviews every M and L diff against
this file. Mechanical rules live in `biome.json` (formatting, imports, kebab-case file names) and
need no mention here. Apply these to new and changed code; existing code is brought in line when
it is touched.

## Domain language

- Tickets, PRs, test names, UI copy and docs use the terms of `GLOSSARY.md`, not their _Avoid_
  synonyms.
- Code keeps the English Prisma model names (`Lender`, `Loan`, `Transaction`, `Project`). A new
  concept without a model takes the glossary term (`jahresliste`, `kontomitteilungen`).

## Server actions and access

- `src/actions/<domain>/{queries,mutations}/` holds only `'use server'` safe-actions that client
  components call. Server-only code lives in `src/lib/<domain>/` with `import 'server-only'`
  ([ADR 0004](docs/adr/0004-actions-are-client-callable-safe-actions.md)).
- Every action uses the client from `src/lib/utils/safe-action.ts` that checks access to the
  entity it touches (`projectAction`, `lenderAction`, `loanAction`, `transactionAction`, …,
  `adminAction`). `actionClient` and `authAction` are for data that belongs to no project.
- A server-only function that trusts its caller to have checked access ends in `Unsafe`. Its
  callers check access first; each new call is a [risk-list](docs/agents/risk-list.md) change.
- Every query on project data is scoped to a project the user manages. Never trust an id from
  the client without the safe-action check of its entity.
- Error messages to the client are translation keys, translated in the frontend.

## Calculations and money

- Interest, balances and savings amounts are computed in `src/lib/calculations/` only, never
  inline in a component, an export or a template.
- A change to a calculation comes with a test next to it, and states its effect on past years
  ([ADR 0005](docs/adr/0005-corrected-interest-from-umstellungsjahr.md),
  [ADR 0006](docs/adr/0006-exporte-are-snapshots-past-years-stay-editable.md)).
- Tests must not depend on the machine's timezone: CI runs them in `Europe/Berlin` and `UTC`.

## Data and schema

- A change to `prisma/schema.prisma` comes with its migration in `prisma/migrations/`.
- Types derive from the Prisma client; relation types live in `src/types/`
  (e.g. `LenderWithRelations`). No `any`.

## UI

- Server Components by default; `'use client'` only where hooks or interactivity need it.
- Use `src/components/ui` (shadcn/ui) before writing a new primitive. Feature components go in
  `src/components/<feature>/`.
- No hard-coded user-facing text: `next-intl` with keys in `src/messages/de/*.json`, split by
  top-level key. Reuse existing keys before adding new ones.
- Forms: react-hook-form with a Zod schema (reuse `src/lib/schemas/`), one form component plus a
  form-fields component, used for both create and edit where possible. Every field has an
  explicit `null` default in `defaultValues`.
- URL state with `nuqs`; `zustand` only where URL state does not fit. Client-side data fetching
  with TanStack Query over server actions. Toasts with `sonner`.

## Tests

- `node:test` files named `*.test.ts` (or `*.spec.ts`) next to the code they cover; `pnpm test` runs them.
- Test the behaviour through the module's public functions, not its internals.

## Scope

- Do what the ticket asks. A refactor, rename or cleanup outside it is its own ticket and PR.
