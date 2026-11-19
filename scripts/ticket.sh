#!/usr/bin/env bash
# Create a ticket in soudis/soliloan and put it on the Soliloan board (default column Ready),
# then read the board back to verify. Conventions: docs/agents/issue-tracker.md
#
#   scripts/ticket.sh --title "..." --label bug|enhancement|documentation [--label discuss]
#                     (--body-file <path> | --body "...") [--status ready|backlog|in-progress]
#                     [--parent <n>] [--blocked-by <n>] [--dry-run]
#
# Prints the issue number on the last line. Needs `gh` with the `project` scope.
set -euo pipefail

REPO=soudis/soliloan
here=$(cd "$(dirname "$0")" && pwd)
die() { echo "ticket.sh: $*" >&2; exit 1; }

title='' body='' body_file='' status=ready parent='' blocked_by='' dry_run=false labels=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --dry-run) dry_run=true; shift; continue ;;
    --title | --body | --body-file | --label | --status | --parent | --blocked-by)
      [[ $# -ge 2 ]] || die "$1 needs a value" ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
  case "$1" in
    --title) title=$2 ;; --body) body=$2 ;; --body-file) body_file=$2 ;; --label) labels+=("$2") ;;
    --status) status=$2 ;; --parent) parent=$2 ;; --blocked-by) blocked_by=$2 ;;
  esac
  shift 2
done

[[ -n $title ]] || die "--title is required"
[[ -n $body || -n $body_file ]] || die "--body or --body-file is required"
[[ -z $body || -z $body_file ]] || die "use either --body or --body-file, not both"
[[ -z $body_file || -r $body_file ]] || die "cannot read --body-file $body_file"
[[ $title =~ ^(feat|fix|chore|docs|refactor|ci)(\(.*\))?: ]] && die "title is an imperative sentence, without a type prefix"
[[ $status =~ ^(ready|backlog|in-progress)$ ]] || die "--status must be ready, backlog or in-progress"
[[ -z $parent || $parent =~ ^[0-9]+$ ]] || die "--parent must be an issue number"
[[ -z $blocked_by || $blocked_by =~ ^[0-9]+$ ]] || die "--blocked-by must be an issue number"
types=0
for l in "${labels[@]}"; do
  case "$l" in
    bug | enhancement | documentation) types=$((types + 1)) ;;
    discuss) ;;
    *) die "unknown label '$l' (bug, enhancement, documentation, discuss)" ;;
  esac
done
((types == 1)) || die "exactly one of --label bug|enhancement|documentation is required"

if $dry_run; then
  echo "Dry run: would create '$title' in $REPO, labels ${labels[*]}, board $status${parent:+, parent #$parent}${blocked_by:+, blocked by #$blocked_by}"
  exit 0
fi

args=(-R "$REPO" --title "$title")
if [[ -n $body_file ]]; then args+=(--body-file "$body_file"); else args+=(--body "$body"); fi
for l in "${labels[@]}"; do args+=(--label "$l"); done
url=$(gh issue create "${args[@]}" | tail -n1)
n=${url##*/}
[[ -z $parent ]] || gh issue edit "$parent" -R "$REPO" --add-sub-issue "$n" >/dev/null
[[ -z $blocked_by ]] || gh issue edit "$n" -R "$REPO" --add-blocked-by "$blocked_by" >/dev/null

"$here/board-status.sh" "$n" "$status"

# Verify by reading the issue's project items back.
want=$(case $status in ready) echo Ready ;; backlog) echo Backlog ;; in-progress) echo "In progress" ;; esac)
got=$(gh issue view "$n" -R "$REPO" --json projectItems --jq '.projectItems[] | select(.title == "Soliloan") | .status.name')
[[ $got == "$want" ]] || die "#$n is on the board as '${got:-missing}', expected '$want'"
echo "Issue: $url"
echo "$n"
