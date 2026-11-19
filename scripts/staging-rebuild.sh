#!/usr/bin/env bash
# Rebuild `staging` as `main` plus every open PR labelled `on-staging`, check it and push it.
# Pushing `staging` deploys it. Details: "Staging" in docs/agents/workflow.md
#
#   scripts/staging-rebuild.sh            rebuild, check and push
#   scripts/staging-rebuild.sh --dry-run  rebuild and check; push nothing, comment nothing
#   scripts/staging-rebuild.sh --continue go on after resolving a conflict in the rebuild worktree
#   scripts/staging-rebuild.sh --abort    drop a stopped rebuild
#
# 1. Fetch main, staging and the labelled PRs (oldest PR first).
# 2. Learn the conflict resolutions of the old staging: its merge commits with a
#    `Staging-Resolved:` trailer are replayed into git rerere.
# 3. In a temporary worktree, start from origin/main and merge each PR with --no-ff. Stop at the
#    first conflict rerere cannot replay; a PR that conflicts with main alone stops the run.
# 4. Install and run `pnpm verify`.
# 5. Warn about migrations of the old staging that the new one removes, renames or changes.
# 6. Push in one atomic push: the old staging to backup/staging-<UTC time> and the new staging
#    with --force-with-lease (refused when the remote staging moved since step 1). Keep the newest
#    5 backups, comment on the PRs whose conflict was resolved by hand, print the deploy run.
#
# The script never touches your checkout. For testing the script itself: STAGING_REMOTE (default
# origin), STAGING_REPO (owner/name, default from the remote URL), STAGING_REBUILD_CHECKS (a shell
# command run in the rebuild worktree instead of install + pnpm verify).
set -euo pipefail

REMOTE="${STAGING_REMOTE:-origin}"
BRANCH="staging"
LABEL="on-staging"
KEEP_BACKUPS=5
DEPLOY_WORKFLOW="staging.yml"

die() { echo "staging-rebuild: $*" >&2; exit 1; }
info() { echo "staging-rebuild: $*"; }

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
COMMON="$(git rev-parse --path-format=absolute --git-common-dir)"
WORK="$COMMON/staging-rebuild"
TREE="$WORK/tree"
STATE="$WORK/state"
REFS="refs/staging-rebuild"

# git in the rebuild worktree, with rerere recording and replaying resolutions
g() { git -C "$TREE" -c rerere.enabled=true -c rerere.autoUpdate=true "$@"; }

# --- state of a stopped rebuild ---------------------------------------------------------------
# PRS:      "<number>:<head branch> ..." in merge order
# NEXT:     1-based index into PRS of the PR being merged next (or in conflict)
# RESOLVED: "<number>|<merge commit>|<#a,#b>|<file,file> ..." conflicts resolved by hand this run
DRY_RUN=false REPO="" OLD="" MAIN_SHA="" PRS="" NEXT=1 RESOLVED=""
CONFLICT_PR="" CONFLICT_FILES="" CONFLICT_WITH=""

save_state() {
  local v
  for v in DRY_RUN REPO OLD MAIN_SHA PRS NEXT RESOLVED CONFLICT_PR CONFLICT_FILES CONFLICT_WITH; do
    printf '%s=%q\n' "$v" "${!v}"
  done >"$STATE"
}

cleanup() {
  [ ! -d "$TREE" ] || git worktree remove --force "$TREE"
  git worktree prune
  rm -rf "$WORK"
  git for-each-ref --format='delete %(refname)' "$REFS/" | git update-ref --stdin
}

# --- setup ------------------------------------------------------------------------------------
repo_slug() {
  local slug="${STAGING_REPO:-}"
  [ -n "$slug" ] || slug="$(git remote get-url "$REMOTE" | sed -E 's#^(git@|ssh://git@|https://)github\.com[:/]##; s#\.git$##')"
  [[ $slug =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die "cannot tell the GitHub repo of remote '$REMOTE'; set STAGING_REPO=owner/name"
  echo "$slug"
}

ensure_label() {
  if gh label list --repo "$REPO" --limit 500 --json name --jq '.[].name' | grep -qxF "$LABEL"; then return; fi
  if $DRY_RUN; then
    info "label '$LABEL' does not exist yet; a run without --dry-run creates it"
    return
  fi
  gh label create "$LABEL" --repo "$REPO" --color 0E8A16 \
    --description "Merged into staging by scripts/staging-rebuild.sh" >/dev/null
  info "created label '$LABEL'"
}

fetch_all() {
  git fetch -q "$REMOTE" "+refs/heads/main:refs/remotes/$REMOTE/main"
  MAIN_SHA="$(git rev-parse "refs/remotes/$REMOTE/main")"
  OLD=""
  if git ls-remote --exit-code --heads "$REMOTE" "refs/heads/$BRANCH" >/dev/null; then
    git fetch -q "$REMOTE" "+refs/heads/$BRANCH:$REFS/old"
    OLD="$(git rev-parse "$REFS/old")"
  fi

  local list entry n ref base refspecs=()
  list="$(gh pr list --repo "$REPO" --label "$LABEL" --state open --limit 100 \
    --json number,headRefName,baseRefName \
    --jq 'sort_by(.number)[] | "\(.number):\(.headRefName):\(.baseRefName)"')"
  PRS=""
  for entry in $list; do
    n="${entry%%:*}" ref="${entry#*:}" base="${ref##*:}" ref="${ref%:*}"
    [ "$base" = main ] || info "warning: #$n targets '$base', not main; it is merged anyway"
    PRS="$PRS $n:$ref"
    refspecs+=("+refs/pull/$n/head:$REFS/pr/$n")
  done
  PRS="${PRS# }"
  ((${#refspecs[@]} == 0)) || git fetch -q "$REMOTE" "${refspecs[@]}"
}

# Replay the old staging's hand resolutions into rerere, the way git's contrib/rerere-train.sh does.
learn_resolutions() {
  [ -n "$OLD" ] || return 0
  local merges m count=0
  merges="$(git rev-list --reverse --merges --grep='^Staging-Resolved:' "$OLD" "^$MAIN_SHA")"
  for m in $merges; do
    g checkout -q --detach "$m^1"
    if ! g merge -q --no-ff --no-commit "$m^2" >/dev/null 2>&1; then
      g checkout -q "$m" -- .
      g rerere >/dev/null 2>&1
      count=$((count + 1))
    fi
    g reset -q --hard
  done
  ((count == 0)) || info "learned $count conflict resolution(s) from the old staging"
}

# --- merging ----------------------------------------------------------------------------------
pr_ref() { local e; for e in $PRS; do [ "${e%%:*}" != "$1" ] || { echo "${e#*:}"; return; }; done; }

# Earlier PRs of this run that conflict with PR $1 when merged alone with it; when none does
# (the conflict needs several of them), the earlier PRs that change one of the files $2...
conflict_partners() {
  local n="$1" e m pairwise="" touching=""
  shift
  for e in $PRS; do
    m="${e%%:*}"
    [ "$m" != "$n" ] || break
    git merge-tree --write-tree --no-messages "$REFS/pr/$m" "$REFS/pr/$n" >/dev/null 2>&1 || pairwise="$pairwise,#$m"
    [ -z "$(git diff --name-only "$MAIN_SHA...$REFS/pr/$m" -- "$@")" ] || touching="$touching,#$m"
  done
  pairwise="${pairwise#,}"
  echo "${pairwise:-${touching#,}}"
}

# Files of the merge in progress that conflicted, also those rerere already resolved: git lists
# them in MERGE_MSG under "# Conflicts:".
conflicted_files() {
  { sed -n 's/^#\t//p' "$(g rev-parse --path-format=absolute --git-path MERGE_MSG)"; g diff --name-only --diff-filter=U; } |
    sort -u
}

commit_resolution() {
  local files="$1" partners="$2"
  g commit -q --no-edit --cleanup=strip --trailer "Staging-Resolved: ${files//$'\n'/, }" \
    ${partners:+--trailer "Staging-Conflicts-With: ${partners//,/, }"}
}

merge_prs() {
  local i=0 e n ref files partners rc
  for e in $PRS; do
    i=$((i + 1))
    ((i >= NEXT)) || continue
    n="${e%%:*}" ref="${e#*:}"

    rc=0
    git merge-tree --write-tree --no-messages "$MAIN_SHA" "$REFS/pr/$n" >/dev/null || rc=$?
    if ((rc == 1)); then
      cleanup
      die "#$n ($ref) conflicts with main itself. Merge main into $ref (or remove the '$LABEL' label), then run again."
    fi
    ((rc == 0)) || die "git merge-tree failed for #$n"

    if g merge -q --no-ff -m "Merge #$n ($ref) into staging" "$REFS/pr/$n" >/dev/null 2>&1; then
      info "merged #$n ($ref)"
      NEXT=$((i + 1))
      continue
    fi

    files="$(conflicted_files)"
    [ -n "$files" ] || die "merging #$n failed without a conflict; see 'git -C $TREE status'"
    # shellcheck disable=SC2086 # file names have no spaces
    partners="$(conflict_partners "$n" $files)"
    if [ -z "$(g diff --name-only --diff-filter=U)" ]; then
      commit_resolution "$files" "$partners"
      info "merged #$n ($ref), replayed the recorded resolution of: ${files//$'\n'/ }"
      # A resolution from the local rr-cache that never reached the remote staging gets its comments.
      [ -n "$OLD" ] && [ -n "$(git rev-list -1 --all-match --grep="^Merge #$n (" --grep='^Staging-Resolved:' "$OLD" "^$MAIN_SHA")" ] ||
        RESOLVED="${RESOLVED:+$RESOLVED }$n|$(g rev-parse HEAD)|$partners|$(paste -sd, <<<"$files")"
      NEXT=$((i + 1))
      continue
    fi

    CONFLICT_PR="$n" CONFLICT_FILES="${files//$'\n'/ }" CONFLICT_WITH="$partners" NEXT="$i"
    save_state
    cat >&2 <<EOF
staging-rebuild: #$n ($ref) conflicts with ${partners:-an earlier $LABEL PR} in:
  ${files//$'\n'/$'\n'  }
Resolve it in the rebuild worktree and stage the files:
  cd $TREE
  git status
  git add <files>
then continue:
  $SELF --continue
or give up:
  $SELF --abort
EOF
    exit 2
  done
}

continue_merge() {
  local files="${CONFLICT_FILES// /$'\n'}" head2=""
  if g rev-parse -q --verify MERGE_HEAD >/dev/null; then
    [ -z "$(g diff --name-only --diff-filter=U)" ] ||
      die "unresolved files in $TREE: $(g diff --name-only --diff-filter=U | tr '\n' ' ')- resolve and 'git add' them"
    commit_resolution "$files" "$CONFLICT_WITH"
  else
    # The merge was committed by hand: accept it if it merges this PR, and add the trailers.
    head2="$(g rev-parse -q --verify 'HEAD^2' || true)"
    [ "$head2" = "$(git rev-parse "$REFS/pr/$CONFLICT_PR")" ] ||
      die "no merge of #$CONFLICT_PR in progress or committed in $TREE; run --abort and start again"
    g commit -q --amend --no-edit --cleanup=strip --trailer "Staging-Resolved: ${CONFLICT_FILES// /, }" \
      ${CONFLICT_WITH:+--trailer "Staging-Conflicts-With: ${CONFLICT_WITH//,/, }"}
  fi
  RESOLVED="${RESOLVED:+$RESOLVED }$CONFLICT_PR|$(g rev-parse HEAD)|$CONFLICT_WITH|${CONFLICT_FILES// /,}"
  info "merged #$CONFLICT_PR ($(pr_ref "$CONFLICT_PR")) with your resolution"
  NEXT=$((NEXT + 1)) CONFLICT_PR="" CONFLICT_FILES="" CONFLICT_WITH=""
  save_state
}

# --- checks and warnings ----------------------------------------------------------------------
run_checks() {
  if [ -n "${STAGING_REBUILD_CHECKS:-}" ]; then
    info "checks: $STAGING_REBUILD_CHECKS"
    (cd "$TREE" && bash -c "$STAGING_REBUILD_CHECKS")
    return
  fi
  info "checks: pnpm install, prisma generate, pnpm verify"
  (
    cd "$TREE"
    export CI=true DATABASE_URL="${DATABASE_URL:-postgresql://ci:ci@127.0.0.1:5432/ci}"
    pnpm install --frozen-lockfile --prefer-offline --reporter=silent
    pnpm prisma:generate >/dev/null
    pnpm verify
  )
}

# "<name> <blob>" per migration folder
migrations_of() {
  git ls-tree -r "$1" -- prisma/migrations |
    awk '$4 ~ /^prisma\/migrations\/[^\/]+\/migration\.sql$/ { split($4, p, "/"); print p[3], $3 }'
}

warn_migrations() {
  [ -n "$OLD" ] || return 0
  local report
  report="$(awk '
    NR == FNR { blob[$1] = $2; name[$2] = $1; next }
    !($1 in blob) { if ($2 in name) print "  renamed  " $1 " -> " name[$2]; else print "  removed  " $1; next }
    blob[$1] != $2 { print "  changed  " $1 }
  ' <(migrations_of "$(g rev-parse HEAD)") <(migrations_of "$OLD"))"
  [ -n "$report" ] || return 0
  cat >&2 <<EOF
staging-rebuild: warning: migrations the staging database already applied differ in the new staging:
$report
Prisma tracks applied migrations by folder name: a renamed one runs again under its new name, a
changed one does not run again, a removed one stays applied. Check the staging database after the
deploy and fix it by hand if needed.
EOF
}

# --- pushing ----------------------------------------------------------------------------------
push_staging() {
  local new="$1" backup refspecs=()
  backup="backup/staging-$(date -u +%Y%m%d-%H%M%S)"
  [ -z "$OLD" ] || refspecs+=("$OLD:refs/heads/$backup")
  refspecs+=("$new:refs/heads/$BRANCH")
  if ! git push -q --atomic --force-with-lease="refs/heads/$BRANCH:$OLD" "$REMOTE" "${refspecs[@]}"; then
    local now
    now="$(git ls-remote --heads "$REMOTE" "refs/heads/$BRANCH" | cut -f1)"
    cleanup
    [ "$now" = "$OLD" ] ||
      die "push refused: the remote $BRANCH moved since this run read it (${OLD:-absent}). Nothing was pushed. Run the script again."
    die "push failed (see above); the atomic push changed nothing. Run the script again."
  fi
  info "pushed $BRANCH = ${new:0:12}${OLD:+, old staging kept as $backup}"
}

prune_backups() {
  local old_backups
  old_backups="$(git ls-remote --heads "$REMOTE" 'backup/staging-*' | awk '{ sub("refs/heads/", "", $2); print $2 }' |
    grep -E '^backup/staging-[0-9]{8}-[0-9]{6}$' | sort -r | tail -n +$((KEEP_BACKUPS + 1)) || true)"
  [ -n "$old_backups" ] || return 0
  # shellcheck disable=SC2086 # one branch name per word
  git push -q "$REMOTE" --delete $old_backups
  info "deleted old backups: $(tr '\n' ' ' <<<"$old_backups")"
}

comment_resolutions() {
  local item n sha partners files pr list body
  for item in $RESOLVED; do
    IFS='|' read -r n sha partners files <<<"$item"
    list="#$n${partners:+ and ${partners//,/, }}"
    body="**Staging conflict** (\`scripts/staging-rebuild.sh\`): $list conflict on staging in \`${files//,/\`, \`}\`.

The resolution is the staging merge commit https://github.com/$REPO/commit/$sha (\`git show $sha\`).
Until one of these PRs merges, each staging rebuild replays it (git rerere, \`Staging-Resolved\` trailer).
**The PR that merges into \`main\` second repeats this resolution** when it merges \`main\` into its branch."
    for pr in $n ${partners//,/ }; do
      gh pr comment "${pr#\#}" --repo "$REPO" --body "$body" >/dev/null
      info "commented on #${pr#\#}"
    done
  done
}

print_deploy_run() {
  local new="$1" url="" i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    url="$(gh run list --repo "$REPO" --workflow "$DEPLOY_WORKFLOW" --branch "$BRANCH" --limit 5 \
      --json headSha,url --jq ".[] | select(.headSha == \"$new\") | .url" | head -n1)"
    [ -z "$url" ] || break
    ((i == 12)) || sleep 5
  done
  if [ -n "$url" ]; then
    info "deploy run: $url"
  else
    info "deploy run not listed yet: gh run list --repo $REPO --workflow $DEPLOY_WORKFLOW --branch $BRANCH"
  fi
}

finish() {
  local new
  if ! run_checks; then
    rm -f "$STATE"
    die "checks failed on the rebuilt staging; nothing was pushed. The worktree stays at $TREE for a look until the next run. Fix the PR(s) and run again."
  fi
  warn_migrations
  new="$(g rev-parse HEAD)"
  info "new staging ${new:0:12}: main ${MAIN_SHA:0:12} plus"
  g log --first-parent --format='  %s' "$MAIN_SHA..$new" | tac
  if $DRY_RUN; then
    info "dry run: pushed nothing${RESOLVED:+, commented nothing}. Old staging: ${OLD:-absent}"
    cleanup
    return
  fi
  if [ "$new" = "$OLD" ]; then
    info "staging is already $new; nothing to push"
    cleanup
    return
  fi
  push_staging "$new"
  prune_backups
  comment_resolutions
  print_deploy_run "$new"
  cleanup
}

# --- main -------------------------------------------------------------------------------------
mode="run"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --continue) mode="continue" ;;
    --abort) mode="abort" ;;
    -h | --help) sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument '$arg' (--dry-run, --continue, --abort, --help)" ;;
  esac
done

case "$mode" in
  abort)
    [ -d "$WORK" ] || die "no stopped rebuild to abort"
    cleanup
    info "dropped the stopped rebuild"
    ;;
  continue)
    [ -f "$STATE" ] || die "no stopped rebuild to continue"
    # shellcheck disable=SC1090
    source "$STATE"
    [ -n "$CONFLICT_PR" ] || die "the stopped rebuild has no conflict to continue; run --abort"
    continue_merge
    merge_prs
    finish
    ;;
  run)
    command -v gh >/dev/null || die "gh not found"
    if ! [[ $(git version) =~ ([0-9]+)\.([0-9]+) ]] ||
      ((BASH_REMATCH[1] < 2 || (BASH_REMATCH[1] == 2 && BASH_REMATCH[2] < 38))); then
      die "git 2.38 or newer needed (merge-tree --write-tree)"
    fi
    [ ! -f "$STATE" ] || die "a stopped rebuild waits in $TREE: resolve it and run --continue, or run --abort"
    cleanup
    REPO="$(repo_slug)"
    ensure_label
    fetch_all
    info "main ${MAIN_SHA:0:12}, old staging ${OLD:0:12}, '$LABEL' PRs: ${PRS:-none}"
    mkdir -p "$WORK"
    git worktree add -q --detach "$TREE" "$MAIN_SHA"
    learn_resolutions
    g checkout -q --detach "$MAIN_SHA"
    merge_prs
    finish
    ;;
esac
