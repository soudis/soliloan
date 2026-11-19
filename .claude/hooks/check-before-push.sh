#!/usr/bin/env bash
# PreToolUse hook (Bash): before a `git push`, run the Biome checks CI runs (`pnpm lint`,
# `pnpm format`) on the whole repo and block the push (exit 2) when they fail. Catches what
# format-on-edit.sh never saw, e.g. files changed by a shell command or a merge.
set -uo pipefail

input=$(cat)
read -r is_push cwd < <(node -e '
  const i = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const cmd = (i.tool_input && i.tool_input.command) || "";
  const push = /(^|[\s;&|(])git(\s+-[cC]\s+\S+)*\s+push(\s|$)/.test(cmd);
  console.log(push ? "true" : "false", i.cwd || ".");
' <<<"$input")

[[ "$is_push" == "true" ]] || exit 0

root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0
if [[ ! -x "$root/node_modules/.bin/biome" ]]; then
  echo "Push blocked: Biome is not installed in $root, so lint and format were not checked." >&2
  echo "Run 'pnpm install' there (in a worktree, 'scripts/worktree-dev.sh up' does it), then push again." >&2
  exit 2
fi

for check in lint format; do
  if ! out=$(cd "$root" && pnpm -s "$check" 2>&1); then
    echo "Push blocked: 'pnpm $check' failed (CI would fail too)." >&2
    echo "$out" | tail -40 >&2
    echo "Fix it (pnpm exec biome check --write <files>), commit, and push again." >&2
    exit 2
  fi
done
exit 0
