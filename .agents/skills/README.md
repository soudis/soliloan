# Team skills

Every skill the workflow ([docs/agents/workflow.md](../../docs/agents/workflow.md)) uses lives
here, so the whole team runs the same versions and changes go through PRs. Claude Code reads them
through the `.claude/skills` symlink; Cursor reads this folder directly.

- **Ours**: `soliloan-start` (size a task into its lane, set up ticket, branch, board and dev
  stack, start working) and `soliloan-review` (the lane's reviewers in parallel, verified
  findings, triage, one PR comment). Edit freely. Name new team skills `soliloan-…`:
  `scripts/pr-size.sh` treats every other folder here as vendored and does not count it.
- **Vendored**, tracked in `skills-lock.json` and installed with the
  [`skills` CLI](https://skills.sh):
  - [mattpocock/skills](https://github.com/mattpocock/skills): `codebase-design`,
    `code-review-docs`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `grill-with-docs`,
    `handoff`, `pr`, `prototype`, `research`, `tdd`, `writing-for-agents`
  - [vercel/next.js](https://github.com/vercel/next.js): `next-dev-loop`
  - [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman): `caveman`

  Upstream's `code-review` is installed as `code-review-docs` (`--rename`, kept in the lock as
  `skillName`), so it stays clear of Claude Code's built-in `/code-review`. Repo-specific
  behaviour goes into `docs/agents/`, `CODING_STANDARDS.md` and `GLOSSARY.md`, which these skills
  read, never into the skill files.

## Updating and adding

```bash
npx skills update -p                                   # all vendored skills
npx skills add mattpocock/skills -s <name> -a claude-code -y
```

Do it in a PR and read the diff: skills run with full agent permissions.

## Personal copies win

Claude Code runs `~/.claude/skills/<name>` instead of the repo's skill when both exist. Delete
your personal copies of the skills above so the repo version is the one that runs.

Built-in skills (`code-review`, `security-review`, `simplify`) ship with Claude Code and are not
copied here.
