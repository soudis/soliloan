# Issue tracker: GitHub

Issues live in `soudis/soliloan` on GitHub, worked through the `gh` CLI (run inside the clone, it infers the repo). Skills that say "publish to the issue tracker" create a GitHub issue; "fetch the ticket" means `gh issue view`.

## Read and write

- **Read**: `gh issue view <n> --json number,title,body,labels,comments`
- **List**: `gh issue list --state open --json number,title,labels` (filter with `--label`)
- **Comment**: `gh issue comment <n> --body "..."`
- **Labels**: `gh issue edit <n> --add-label "..."` / `--remove-label "..."`
- **Close**: comment first, then `gh issue close <n>` (PRs close their issue via `Closes #<n>`)
- **Sub-issue / blocking**: `gh issue edit <parent> --add-sub-issue <child>`, `gh issue edit <child> --add-blocked-by <blocker>`

File issues only into `soudis/soliloan`, never into an upstream repo of a fork. A bare `#42` can be an issue or a PR: try `gh issue view 42`, then `gh pr view 42`.

## Creating a ticket

Only when the user asks. Show the draft (title, labels, body) and wait for a go-ahead before `gh issue create`.

- **Title**: imperative English sentence, no type prefix. "Add part-year interest payout", not "feat: ..." or "Interest payout".
- **Labels** (existing): exactly one of `bug`, `enhancement`, `documentation`; add `discuss` while the design is still open; `v1` and `v1 - milestone N` only when the user says so. There is no triage-label vocabulary.
- **Body**: three sections, using the German terms from `GLOSSARY.md` for domain concepts (Kredit, Kreditgeber*in, Zahlung, ...):

  ```markdown
  ## Problem
  What is wrong or missing, and for whom.

  ## Desired behaviour
  What should happen instead.

  ## Acceptance criteria
  - [ ] observable, testable outcomes
  ```

  Link legacy behaviour or related issues instead of retelling them.
- **Board**: every ticket must land on the project board in the column that matches its state, see below.

```bash
gh issue create --title "Add part-year interest payout" --label enhancement --body-file /tmp/issue.md
scripts/board-status.sh <n> ready
```

## Project board

Board: <https://github.com/users/soudis/projects/3> ("Soliloan"), field **Status**: Backlog, Ready, In progress, In review, Done, Archived. Priority (P0-P2) and Size (XS-XL) stay unset unless the user gives them.

`scripts/board-status.sh <issue> backlog|ready|in-progress|in-review|done` adds the issue to the board if missing and sets Status (needs `gh` with the `project` scope: `gh auth refresh -s project`).

| When | Status |
| --- | --- |
| Ticket created | `ready` (`in-progress` if work has started, `in-review` if a PR exists, `done` if already merged) |
| Agent starts work on it | `in-progress` |
| PR opened | `in-review` |
| After the merge to `main` | `done` |

## Pull requests are not a request surface

PRs are not triaged like issues here. Branch, commit and PR naming: [workflow.md](workflow.md).
