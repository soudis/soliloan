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
[[ -d "$root/node_modules" ]] || exit 0

changed=$(
  {
    [[ -f "$touched" ]] && cat "$touched"
    git -C "$root" status --porcelain --untracked-files=all | cut -c4-
  } | grep -E '\.tsx?$' || true
)
[[ -n "$changed" ]] || exit 0

out=$(cd "$root" && pnpm -s typecheck 2>&1)
errors=$(echo "$out" | grep -E 'error TS' | grep -v -E '^\.next/' || true)
if [[ -n "$errors" ]]; then
  echo "pnpm typecheck failed:" >&2
  echo "$errors" | head -40 >&2
  echo "Fix these type errors before finishing. If they name Prisma model fields, the client may be stale: run pnpm prisma:generate." >&2
  exit 2
fi
rm -f "$touched"
exit 0
