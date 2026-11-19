#!/usr/bin/env bash
# PostToolUse hook (Edit/Write): run Biome on the edited file, fix what it safely can, and send
# what is left back to the agent (exit 2). Records .ts/.tsx files so the Stop hook knows the
# session changed TypeScript.
set -uo pipefail

input=$(cat)
read -r session_id file_path < <(node -e '
  const i = JSON.parse(require("fs").readFileSync(0, "utf8"));
  console.log(i.session_id || "unknown", (i.tool_input && i.tool_input.file_path) || "");
' <<<"$input")

[[ -n "$file_path" && -f "$file_path" ]] || exit 0

case "$file_path" in
  *.ts | *.tsx) echo "$file_path" >>"${TMPDIR:-/tmp}/claude-touched-${session_id}" ;;
esac

case "$file_path" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css) ;;
  *) exit 0 ;;
esac

root=$(git -C "$(dirname "$file_path")" rev-parse --show-toplevel 2>/dev/null) || exit 0
biome="$root/node_modules/.bin/biome"
[[ -x "$biome" ]] || exit 0

# Files that biome.json excludes are skipped, not reported.
if ! out=$(cd "$root" && "$biome" check --write --no-errors-on-unmatched \
  --files-ignore-unknown=true "$file_path" 2>&1); then
  echo "Biome found problems it could not fix in $file_path:" >&2
  echo "$out" | head -60 >&2
  exit 2
fi
exit 0
