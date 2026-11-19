#!/usr/bin/env bash
# Lane of the current change (see "Lanes" in docs/agents/workflow.md): counted changed lines
# (added + deleted) of the working tree against the merge-base with <base>, plus the risk-list
# paths it touches. Untracked files are not seen: commit them or `git add -N` them first.
#
#   scripts/pr-size.sh [base] [--mechanical]
#
# base          defaults to origin/main
# --mechanical  only a dependency bump, rename or removal: lane S whatever the size
#
# Not counted, because nobody reviews them line by line:
#   - generated: pnpm-lock.yaml, prisma/migrations/, prisma/generated/, .next/, snapshots
#   - vendored skills: .agents/skills/<name>/ unless <name> starts with soliloan- (ours)
#   - deleted files, pure renames and blocks git detects as moved unchanged
set -euo pipefail

base=origin/main mechanical=false
for arg in "$@"; do
  case "$arg" in
    --mechanical) mechanical=true ;;
    -h | --help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) base=$arg ;;
  esac
done

root=$(git rev-parse --show-toplevel)
SMALL=150 LARGE=800
generated='(^|/)pnpm-lock\.yaml$|^prisma/migrations/|^prisma/generated/|(^|/)\.next/|\.snap$'
mb=$(git merge-base "$base" HEAD)

# Per file: "<counted>\t<moved>\t<path>\t<kind>" with kind counted|generated|vendored.
# Moved lines are told apart by colour: git paints them blue (+) and magenta (-).
per_file=$(git -c color.diff.new=green -c color.diff.old=red \
  -c color.diff.newMoved=blue -c color.diff.oldMoved=magenta \
  -c color.diff.newMovedAlternative=blue -c color.diff.oldMovedAlternative=magenta \
  -c color.diff.newMovedDimmed=blue -c color.diff.oldMovedDimmed=magenta \
  -c color.diff.newMovedAlternativeDimmed=blue -c color.diff.oldMovedAlternativeDimmed=magenta \
  diff --color=always --color-moved=blocks --color-moved-ws=allow-indentation-change \
  --diff-filter=d -M "$mb" |
  awk -v gen="$generated" '
    function flush() {
      if (file == "" || counted + moved == 0) return
      kind = "counted"
      if (file ~ gen) kind = "generated"
      else if (file ~ /^\.agents\/skills\/[^\/]+\// && file !~ /^\.agents\/skills\/soliloan-/) kind = "vendored"
      print counted "\t" moved "\t" file "\t" kind
    }
    /^\033\[1mdiff --git / { flush(); line = $0; gsub(/\033\[[0-9;]*m/, "", line); sub(/.* b\//, "", line); file = line; counted = 0; moved = 0; next }
    /^\033\[1m(\+\+\+|---) / { next }
    /^\033\[3[45]m[-+]/ { moved++; next }
    /^\033\[3[12]m[-+]/ { counted++; next }
    END { flush() }')

sum() { awk -F'\t' -v k="$1" -v c="$2" '$4 == k { s += $c } END { print s + 0 }' <<<"$per_file"; }
total=$(sum counted 1)
moved=$(sum counted 2)
files=$(awk -F'\t' '$4 == "counted" && $1 > 0' <<<"$per_file" | wc -l)

# Risk-list paths: the ```risk-paths block of docs/agents/risk-list.md, one regex per line.
patterns=$(awk '/^```risk-paths/ { on = 1; next } /^```/ { on = 0 } on { sub(/[ \t]+#.*/, ""); if ($0 != "") print }' \
  "$root/docs/agents/risk-list.md")
changed=$(git diff --name-only --diff-filter=d -M "$mb")
risky=$( [[ -n $patterns && -n $changed ]] && grep -E -f <(echo "$patterns") <<<"$changed" || true)
# New calls of *Unsafe functions in actions or routes: the caller must check access itself.
unsafe=$(git diff -U0 "$mb" -- src/actions src/app | grep -cE '^\+.*[A-Za-z]Unsafe\(' || true)

if $mechanical; then lane=S
elif [[ -n $risky ]] || ((unsafe > 0)) || ((total > LARGE)); then lane=L
elif ((total > SMALL)); then lane=M
else lane=S
fi

echo "lines: $total"
echo "files: $files"
echo "lane:  $lane"
echo "not counted: $moved moved, $(($(sum vendored 1) + $(sum vendored 2))) vendored, $(($(sum generated 1) + $(sum generated 2))) generated"
if [[ -n $risky ]]; then
  echo "risk list:"
  sed 's/^/  /' <<<"$risky"
fi
((unsafe == 0)) || echo "new *Unsafe calls in src/actions or src/app: $unsafe"
exit 0
