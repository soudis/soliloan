#!/usr/bin/env bash
# Put an issue on the Soliloan project board and set its Status column.
# Adds the issue if it is not on the board yet. Details: docs/agents/issue-tracker.md
#
#   scripts/board-status.sh <issue-number> backlog|ready|in-progress|in-review|done
#
# Needs `gh` with the `project` scope (gh auth refresh -s project).
set -euo pipefail

OWNER="soudis"
REPO="soudis/soliloan"
PROJECT_NUMBER="3"

die() { echo "board-status: $*" >&2; exit 1; }

[ "$#" -eq 2 ] || die "usage: $0 <issue-number> backlog|ready|in-progress|in-review|done"
issue="$1"
case "$issue" in ''|*[!0-9]*) die "issue number must be numeric, got '$issue'" ;; esac

case "$2" in
  backlog)     status="Backlog" ;;
  ready)       status="Ready" ;;
  in-progress) status="In progress" ;;
  in-review)   status="In review" ;;
  done)        status="Done" ;;
  *) die "unknown status '$2' (backlog|ready|in-progress|in-review|done)" ;;
esac

command -v gh >/dev/null || die "gh not found"

project_id="$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq .id)"
field_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  --jq '.fields[] | select(.name == "Status") | .id')"
option_id="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  --jq ".fields[] | select(.name == \"Status\") | .options[] | select(.name == \"$status\") | .id")"
[ -n "$field_id" ] && [ -n "$option_id" ] || die "could not find Status option '$status' on project $PROJECT_NUMBER"

# item-add is idempotent: it returns the existing item when the issue is already on the board
item_id="$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" \
  --url "https://github.com/$REPO/issues/$issue" --format json --jq .id)"

gh project item-edit --id "$item_id" --project-id "$project_id" \
  --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null

echo "#$issue -> $status (project $PROJECT_NUMBER)"
