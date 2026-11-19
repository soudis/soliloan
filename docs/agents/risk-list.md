# Risk list

Changes where a mistake costs money, leaks another project's data, or cannot be rolled back. A
change that touches one of these is lane L ([workflow.md](workflow.md#lanes)), gets the
`security-review` reviewer in `/soliloan-review`, and needs a teammate's approval before merge.

| Category | What can go wrong | Where |
| --- | --- | --- |
| Calculations | Wrong Zinsen, Kontostand or savings amounts in every Kontomitteilung | `src/lib/calculations/`, [ADR 0005](../adr/0005-corrected-interest-from-umstellungsjahr.md) |
| Zahlungen and bank import | Missing, doubled or misassigned Zahlungen | `src/lib/transactions/`, `src/actions/transactions/`, `src/lib/gocardless/`, `src/actions/gocardless/`, `src/app/api/gocardless/` |
| Access and tenant isolation | A manager sees or changes another project's Kreditgeber*innen | `src/lib/utils/safe-action.ts`, `src/lib/auth.ts`, `src/lib/require-session.ts`, `src/lib/token.ts`, `src/lib/invites/`, `src/actions/auth.ts`, `src/app/api/auth/`, `src/proxy.ts`, any new call of an `…Unsafe` function ([ADR 0004](../adr/0004-actions-are-client-callable-safe-actions.md)) |
| Schema and data | Data loss, a deploy that fails on migrate | `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/migration/` |
| Documents to Kreditgeber*innen | Wrong figures or another person's data in a PDF or email | `src/lib/exports/`, `src/lib/templates/` (merge tags, PDF and email rendering), `src/emails/`, `src/lib/email.ts`, `src/app/api/cron/` |
| Build and deploy | A broken staging or production deploy, leaked secrets | `.github/workflows/`, `docker/`, `src/lib/env.ts` |

Behaviour counts as well as paths: a new database query without project scoping, or an amount
computed outside `src/lib/calculations/`, is a risk change wherever it lives.

## Paths for `scripts/pr-size.sh`

One extended regex per line, matched against the changed paths. Keep it in sync with the table.

```risk-paths
^src/lib/calculations/
^src/(lib|actions)/(transactions|gocardless)/
^src/app/api/gocardless/
^src/lib/utils/safe-action\.ts$
^src/lib/(auth|auth-set-password|require-session|token)\.ts$
^src/lib/invites/
^src/actions/auth\.ts$
^src/app/api/auth/
^src/proxy\.ts$
^prisma/schema\.prisma$
^prisma/migrations/
^src/lib/migration/
^src/lib/exports/
^src/lib/templates/(merge-tag|merge-tags|email-generator|generate-template-pdf|design-to-pdf|resolve-)
^src/emails/
^src/lib/email\.ts$
^src/app/api/cron/
^\.github/workflows/
^docker/
^src/lib/env\.ts$
```
