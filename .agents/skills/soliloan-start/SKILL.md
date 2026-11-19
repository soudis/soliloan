---
name: soliloan-start
description: Size a ticket or task into its lane (S, M, L), set up ticket, branch, board and dev stack, and start working on it in this session.
disable-model-invocation: true
argument-hint: "<ticket number or URL, PR number, or a sentence describing the task>"
---

Take a task from "here is a ticket" to "working on it": size it into a **lane**
(`docs/agents/workflow.md`, section Lanes), set up everything the workflow requires, then start
the lane's first step. The user stays in the loop: the first question round confirms the setup.

## Steps

### 1. Read the task

- Ticket number or URL: `gh issue view <n> --json number,title,body,labels,comments`.
- PR number: `gh pr view <n> --json title,body,headRefName,files,comments`. Work on an open PR
  (review findings, follow-ups) stays on that PR's branch.
- A sentence: use it as is.

Done when you can state the goal in one sentence.

### 2. Scout

Dispatch one `Explore` sub-agent with a fresh context. Brief: the goal plus the ticket body. Ask
it to return, in under 300 words:

- the paths the change will most likely touch,
- a rough size in changed lines (lockfile and migrations excluded): under 150, under 800, more,
- the ADRs (`docs/adr/`) and `GLOSSARY.md` terms that bear on it,
- existing tests next to the code, or "none",
- **open decisions**: questions the code can't answer and a human must.

When the scout shows the code already does what the task asks, stop: show the evidence (file and
commit) and confirm with the user.

### 3. Risk and overlap

- **Risk**: match the scouted paths and the behaviour against `docs/agents/risk-list.md`.
- **Overlap**: `gh pr list --state open --json number,title,author,files --jq '.[] | {number, title, author: .author.login, files: [.files[].path]}'`;
  keep the PRs that change any of the same files.

### 4. Write the lane card

Pick the lane with the rules in `docs/agents/workflow.md` (Lanes). Open decisions that change an
ADR, a glossary term, the schema or a calculation make it L.

```
**Lane:** <S|M|L>: <one line why: size, risk, decisions>
**Risk:** <risk-list categories, "needs a teammate's approval"> or "none"
**Overlap:** <PR numbers with author and shared paths> or "none"
**Ticket:** #<n>, or the draft title and label
**Branch:** <type>/<n>-<kebab-slug>
**Open decisions:** <the scout's list, or "none">
```

### 5. Set up

Ask the setup as the first round of questions (with `grilling` in M and L, in one message in S),
each with your recommended answer from the card: the lane, the ticket draft when there is none
(skip for dependency bumps), the branch name. Then, on yes:

1. Ticket: `scripts/ticket.sh --title … --label … --body-file … --status in-progress`, or for an
   existing ticket `scripts/board-status.sh <n> in-progress`.
2. Branch: on a `claude/…` worktree branch `git branch -m <branch>` before the first commit;
   otherwise `git switch -c <branch> origin/main` after `git fetch origin main`.
3. Dev stack, when the change is visible in the UI or touches server actions: in a worktree
   `scripts/worktree-dev.sh up` (`docs/agents/worktree-dev.md`), in the primary checkout
   `pnpm docker:dev up`.

### 6. Work the lane

| Lane | Do |
| --- | --- |
| S | Implement (`tdd` for logic), verify, PR. |
| S, a bug whose cause is unknown | `diagnosing-bugs` first, then as S. |
| M | Finish the `grilling` on the open decisions, implement (`tdd` for logic), verify, PR. |
| L | Tell the user to type `/grill-with-docs` (only they can start it): it records terms and ADRs. Then implement in slices of under ~800 lines, each its own PR when they can merge alone. |

**Verify** means `pnpm verify` passes, plus for UI or server-action changes the `next-dev-loop`
skill against the dev stack. Keep the evidence (command output, screenshots) for the PR body.

**PR**: `scripts/pr-size.sh` confirms the lane (a bigger lane than the card: tell the user). Write
the body from `.github/pull_request_template.md` (the `pr` skill shows how to write Summary and
Evidence), title as in `docs/agents/workflow.md`, then `gh pr create --base main` and
`scripts/board-status.sh <n> in-review`.

### 7. Hand over to review

Stop after the PR is open and tell the user to run `/soliloan-review`. Review runs in fresh
contexts, so this session never grades its own work.
