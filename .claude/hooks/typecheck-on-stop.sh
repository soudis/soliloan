#!/usr/bin/env bash
# Stop hook: when the session edited TypeScript (recorded by format-on-edit.sh) or the tree has
# uncommitted .ts/.tsx changes, run `pnpm typecheck` and send type errors back to the agent
# (exit 2) instead of ending the turn. Blocks at most once per turn (stop_hook_active).
set -uo pipefail

input=$(cat)
read -r session_id stop_hook_active cwd < <(node -e '
  const i = JSON.parse(require("fs").readFileSync(0, "utf8"));
  console.log(i.session_id || "unknown", i.stop_hook_active ? "true" : "false", i.cwd || ".");
' <<<"$input")

# Already blocked once this turn: let it end rather than loop.
[[ "$stop_hook_active" == "true" ]] && exit 0

root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0
touched="${TMPDIR:-/tmp}/claude-touched-${session_id}"

changed=$(
  {
    [[ -f "$touched" ]] && cat "$touched"
    git -C "$root" status --porcelain --untracked-files=all | cut -c4-
  } | grep -E '\.tsx?$' || true
)
[[ -n "$changed" ]] || exit 0

if [[ ! -x "$root/node_modules/.bin/tsc" ]]; then
  echo "TypeScript changed but cannot be typechecked: no node_modules in $root." >&2
  echo "Run 'pnpm install' there (in a worktree, 'scripts/worktree-dev.sh up' does it), then 'pnpm typecheck'." >&2
  exit 2
fi

out=$(cd "$root" && pnpm -s typecheck 2>&1)
status=$?
errors=$(echo "$out" | grep -E 'error TS' | grep -v -E '^\.next/' || true)
if [[ -n "$errors" ]]; then
  echo "pnpm typecheck failed:" >&2
  echo "$errors" | head -40 >&2
  echo "Fix these type errors before finishing. If they name Prisma model fields, the client may be stale: run pnpm prisma:generate." >&2
  exit 2
fi
# Errors only in .next/ are generated route types, not this session's code; any other
# failure (pnpm itself, a missing Prisma client, a crash) is reported, not passed.
if [[ "$status" -ne 0 ]] && ! echo "$out" | grep -q -E 'error TS'; then
  echo "pnpm typecheck failed without TypeScript errors (exit $status):" >&2
  echo "$out" | tail -20 >&2
  exit 2
fi
rm -f "$touched"
exit 0
