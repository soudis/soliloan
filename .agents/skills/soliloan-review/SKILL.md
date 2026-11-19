---
name: soliloan-review
description: Review an open PR with independent reviewers in parallel, sized by its lane, verify their findings, triage them with the user, and post one comment on the PR.
disable-model-invocation: true
argument-hint: "[PR number, default the current branch's PR]"
---

Review a PR's diff with independent reviewers in fresh contexts, then turn their reports into
decisions. Reviewers asked to find problems always find some, so every finding is **verified**
against the code before it reaches the user, and the user decides what happens to each.

Run this in the session that wrote the code, after the PR is open: the reviewers are fresh
sub-agents, and the triage needs this session's reasoning.

## Steps

### 1. Pin the diff

- PR: the argument, else `gh pr view --json number,url,headRefName,body`. No PR: stop and say
  to open one first (`soliloan-start` step 6).
- `git fetch origin main`; base is `origin/main`. Check `git diff --stat origin/main...HEAD` is
  non-empty and the branch is pushed (`git status -sb` shows no `ahead`).
- Ticket: the `#<n>` in the PR title or `Closes #<n>` in the body.
- Title the session `Review #<PR> <short title>` when the host has a tool for it (Claude desktop
  app: `mcp__ccd_session_mgmt__set_session_title` with `session_id: "self"`).
- Lane: `scripts/pr-size.sh` (add `--mechanical` for a dependency bump). Record lines, lane, the
  risk-list paths and new `*Unsafe` calls it prints.

### 2. Classify the risk

Match the changed paths and the change's behaviour against `docs/agents/risk-list.md`; record
every matching category. The script finds paths; behaviour (a new query without project
scoping, an amount computed in a new place) is your judgement.

### 3. Dispatch the reviewers

Dispatch as fresh `general-purpose` sub-agents in **one message**, so they run in parallel:

| Reviewer | Skill and arguments | Lane |
| --- | --- | --- |
| Correctness | `code-review` with `high origin/main...HEAD` (`xhigh` in L) | S, M, L |
| Standards + Spec | `code-review-docs` with `origin/main` and ticket #<n> as the spec | M, L |
| Security | `security-review` | L, or any lane with a risk category |

Brief each: "Invoke the Skill tool with `<skill>` and these arguments: `<args>`. If the skill
wants to start sub-agents and you can't, run its steps yourself. Review only: leave files,
commits and GitHub untouched (no `--comment`, no `--fix`). Return the findings in under 600
words, each with `file:line`, what is wrong, and the reviewer's severity."

Done when every reviewer has returned a report or a stated failure.

### 4. Combine and verify

Number the findings (`R1`, `R2`, …) in one table: reviewer, `file:line`, finding, severity.
Merge rows where two reviewers flag the same lines for the same reason. Then read the cited code
for every finding and give it a verdict:

- **Confirmed**: the problem is real at that line.
- **Doubtful**: plausible, but it rests on an assumption (name it).
- **Wrong**: the code doesn't do what the finding says (say what it does).

### 5. Triage with the user

Lane S with no Confirmed or Doubtful finding: skip to step 6. Otherwise invoke the Skill tool
with `grilling`: each Confirmed or Doubtful finding is one question, the recommended answer one
of **fix now**, **change the ticket** (the code is right, the ticket is not), **follow-up
ticket**, or **reject** with the reason. Recommend reject for findings that only add
abstraction, configuration or tests for cases that can't happen. Wrong findings are rejected
without a question.

### 6. Record

- Follow-up tickets: `scripts/ticket.sh … --status ready`, each linking the PR.
- Ticket changes: edit the ticket body (`gh issue edit <n> --body-file …`).
- Post one comment, no confirmation needed: `gh pr comment <n> --body-file <file>` with the lane
  and line count, the reviewers that ran, the risk categories, the findings table with verdict
  and decision, and the follow-up links. When a risk category matched or the lane is L, end with
  `Needs a teammate's approval before merge: <categories or "lane L">.`

### 7. Hand back

Report the counts (findings, confirmed, fix now, follow-ups, rejected) and the **fix now** list.
Fix them on this branch next, run `pnpm verify` again, and push.
