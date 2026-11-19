#!/usr/bin/env bash
# Isolated docker dev stack per git worktree, so agents can run and test the app
# without touching the primary checkout's stack. Details: docs/agents/worktree-dev.md
#
#   scripts/worktree-dev.sh up [slug]     start (or update) the stack, wait until it answers
#   scripts/worktree-dev.sh url           print URL, MCP endpoint, Mailpit, admin login
#   scripts/worktree-dev.sh logs [svc]    follow logs (default: app)
#   scripts/worktree-dev.sh exec <cmd..>  run a command in the app container (pnpm test, ...)
#   scripts/worktree-dev.sh down          remove containers, DB volume and .next
#   scripts/worktree-dev.sh prune [--yes] [project..]  remove stacks of deleted worktrees
#
# Run it from inside the worktree (prune runs anywhere). In the primary checkout use
# `pnpm docker:dev up`.
set -euo pipefail

TRAEFIK_NETWORK="soliloan_traefik_network"
TRAEFIK_PROJECT="soliloan-traefik"
BASE_DOMAIN="soliloan.localhost"
WAIT_SECONDS="${WORKTREE_DEV_WAIT_SECONDS:-600}"
# After the app answers on its own port, how long Traefik may take to pick up its route.
ROUTE_GRACE_SECONDS=20
# One pnpm store for every worktree stack, mounted at /app/.pnpm-store (the path pnpm picks
# anyway, so node_modules never sees a store change). Created here, without a compose
# project label, so neither `down -v` nor `prune` of one stack removes it.
PNPM_STORE_VOLUME="soliloan_pnpm_store"

die() { echo "worktree-dev: $*" >&2; exit 1; }
warn() { echo "worktree-dev: WARNING: $*" >&2; }

command -v docker >/dev/null || die "docker not found"

# Deletes what the root container wrote into a worktree (.next, .pnpm-store from before the
# shared store, prisma/generated), as root through a container of <image> that mounts only
# the worktree, never the shared store volume.
remove_root_owned() {
  local dir="$1" image="$2" paths="${3:-.next .pnpm-store prisma/generated}"
  [ -n "$image" ] || return 0
  docker run --rm --entrypoint sh -w /w -v "$dir:/w" "$image" -c "rm -rf $paths" >/dev/null 2>&1 || true
}

# Stacks (compose projects soliloan-*) whose worktree is gone: the directory is missing, or
# only the root-owned leftovers of the container remain (`git worktree remove` without
# `down`; no .git any more). Running stacks are left alone, so is the shared Traefik.
prune() {
  local yes="" project dir state answer image only
  local -a stale=() dirs=() running=()
  if [ "${1:-}" = "--yes" ]; then yes="--yes"; shift; fi
  only=" $* "
  while IFS='|' read -r project dir; do
    [ -n "$project" ] || continue
    [ "$project" != "$TRAEFIK_PROJECT" ] || continue
    [ "$#" -eq 0 ] || [[ "$only" == *" $project "* ]] || continue
    [ ! -e "$dir/.git" ] || continue
    state="$(docker ps --filter "label=com.docker.compose.project=$project" --filter status=running -q)"
    if [ -n "$state" ]; then running+=("$project"); else stale+=("$project"); dirs+=("$dir"); fi
  done < <(docker ps -a --filter label=com.docker.compose.project \
    --format '{{.Label "com.docker.compose.project"}}|{{.Label "com.docker.compose.project.working_dir"}}' \
    | grep '^soliloan' | sort -u)

  # ${a[@]+...}: macOS ships bash 3.2, where an empty array is "unbound" under set -u.
  for project in ${running[@]+"${running[@]}"}; do echo "Skipped $project: worktree gone but containers still running (stop them first)."; done
  if [ "${#stale[@]}" -eq 0 ]; then echo "Nothing to prune."; return 0; fi
  echo "Stacks whose worktree no longer exists (containers, networks, volumes incl. database):"
  for i in "${!stale[@]}"; do
    if [ -d "${dirs[$i]}" ]; then echo "  ${stale[$i]}  (and its leftovers in ${dirs[$i]})"; else echo "  ${stale[$i]}"; fi
  done
  if [ "$yes" != "--yes" ]; then
    [ -t 0 ] || die "not a terminal; re-run with --yes to remove them"
    read -r -p "Remove them? [y/N] " answer
    case "$answer" in y|Y|yes) ;; *) echo "Nothing removed."; return 0 ;; esac
  fi
  for i in "${!stale[@]}"; do
    project="${stale[$i]}"; dir="${dirs[$i]}"
    # The root-owned directories `down` would have deleted; removed as root through the
    # stack's own image, then the empty directories the user could not delete.
    if [ -d "$dir" ]; then
      image="$(docker ps -a --filter "label=com.docker.compose.project=$project" --filter "label=com.docker.compose.service=app" --format '{{.Image}}' | head -n1)"
      remove_root_owned "$dir" "$image"
      find "$dir" -depth -type d -empty -delete 2>/dev/null || true
      [ ! -d "$dir" ] || echo "  kept $dir: it still holds files"
    fi
    # No compose file to call `down` with (it lived in the deleted worktree): remove by label.
    docker ps -aq --filter "label=com.docker.compose.project=$project" | xargs -r docker rm -f >/dev/null
    docker network ls -q --filter "label=com.docker.compose.project=$project" | xargs -r docker network rm >/dev/null
    docker volume ls -q --filter "label=com.docker.compose.project=$project" | xargs -r docker volume rm >/dev/null
    echo "Removed $project."
  done
}

if [ "${1:-}" = "prune" ]; then
  shift
  prune "$@"
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel)"
MAIN="$(git worktree list --porcelain | awk '/^worktree /{print substr($0, 10); exit}')"
cd "$ROOT"

[ "$ROOT" != "$MAIN" ] || die "this is the primary checkout; use 'pnpm docker:dev up' here, or run from a worktree (git worktree add ...)"

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40 | sed -E 's/-+$//'
}

env_value() { { grep -E "^$1=" .env 2>/dev/null || true; } | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }

# Slug: explicit arg > already generated .env > branch name > directory name
resolve_slug() {
  local slug="${1:-}"
  if [ -z "$slug" ] && [ -f .env ]; then
    slug="$(env_value COMPOSE_PROJECT_NAME | sed -E 's/^soliloan-//')"
    [ "$slug" = "soliloan" ] && slug=""
  fi
  [ -n "$slug" ] || slug="$(git branch --show-current)"
  [ -n "$slug" ] || slug="$(basename "$ROOT")"
  slug="$(slugify "$slug")"
  [ -n "$slug" ] || die "could not derive a slug, pass one: up <slug>"
  echo "$slug"
}

compose() {
  docker compose -p "$PROJECT" -f docker/compose.worktree.yml --project-directory . "$@"
}

# Per-worktree .env: copy of the primary checkout's .env (gitignored, so a fresh
# worktree has none) with the values that must differ per worktree.
write_env() {
  local slug="$1" host="$1.$BASE_DOMAIN"
  if [ ! -f .env ]; then
    if [ -f "$MAIN/.env" ]; then cp "$MAIN/.env" .env
    elif [ -f "$MAIN/.env.example" ]; then cp "$MAIN/.env.example" .env
    else die "no .env or .env.example in $MAIN"; fi
  fi
  local tmp; tmp="$(mktemp)"
  grep -v -E '^(COMPOSE_PROJECT_NAME|TRAEFIK_HOST|TRAEFIK_ROUTER_NAME|NEXTAUTH_URL|SOLILOAN_URL)=' .env > "$tmp" || true
  {
    cat "$tmp"
    echo "# --- generated by scripts/worktree-dev.sh (worktree isolation) ---"
    echo "COMPOSE_PROJECT_NAME=soliloan-$slug"
    echo "TRAEFIK_HOST=$host"
    echo "TRAEFIK_ROUTER_NAME=soliloan-$slug"
    echo "NEXTAUTH_URL=\"https://$host\""
    echo "SOLILOAN_URL=\"https://$host\""
  } > .env
  rm -f "$tmp"
}

# One Traefik for all worktrees; it needs the gitignored mkcert certs of the primary checkout.
traefik_compose() {
  (cd "$MAIN/docker/traefik" && docker compose -p "$TRAEFIK_PROJECT" -f compose.yml "$@")
}

running_traefik() {
  docker ps --filter "network=$TRAEFIK_NETWORK" --format '{{.ID}} {{.Image}}' | awk '$2 ~ /^traefik:/ {print $1; exit}'
}

# A running Traefik can still have no host ports, e.g. when 80/443 were busy as Docker
# restarted it. Then nothing reaches it and `up` would wait in vain.
traefik_ports_bound() {
  [ -n "$(docker port "$1" 80/tcp 2>/dev/null)" ] && [ -n "$(docker port "$1" 443/tcp 2>/dev/null)" ]
}

ensure_traefik() {
  local id project
  docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1 || docker network create "$TRAEFIK_NETWORK" >/dev/null
  id="$(running_traefik)"
  if [ -n "$id" ]; then
    traefik_ports_bound "$id" && return
    project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id")"
    [ "$project" = "$TRAEFIK_PROJECT" ] \
      || die "Traefik of compose project '$project' runs without host ports 80/443; recreate it there (e.g. 'docker compose -p $project up -d --force-recreate traefik') or stop it"
    echo "Shared Traefik runs without host ports 80/443; recreating it..."
    traefik_compose up -d --force-recreate \
      || die "could not recreate Traefik; are ports 80/443/8080 free?"
  else
    [ -f "$MAIN/docker/traefik/certs/cert.pem" ] || die "missing $MAIN/docker/traefik/certs/cert.pem (mkcert certificate for *.$BASE_DOMAIN)"
    echo "Starting shared Traefik (project $TRAEFIK_PROJECT)..."
    traefik_compose up -d \
      || die "could not start Traefik; are ports 80/443/8080 free? (is the primary stack running? then Traefik is already up)"
  fi
  id="$(running_traefik)"
  [ -n "$id" ] || die "Traefik is not running after start; see 'docker compose -p $TRAEFIK_PROJECT logs'"
  traefik_ports_bound "$id" || die "Traefik runs but has no host ports 80/443; are they taken by another process?"
}

# Host dependencies, so the Claude hooks (Biome, typecheck) and host `pnpm test` work in the
# worktree. The container keeps its own node_modules (anonymous volume); prisma/generated is
# shared through the bind mount.
install_host_deps() {
  if ! command -v pnpm >/dev/null; then
    warn "pnpm not found on the host: the Claude hooks (Biome, typecheck) and host tests will not work here"
    return
  fi
  echo "Installing host dependencies (pnpm install)..."
  CI=true pnpm install --frozen-lockfile --prefer-offline \
    || { warn "host 'pnpm install' failed: the Claude hooks and host tests will not work here"; return; }
  # The container regenerates prisma/generated on every start, with the engine it runs on.
  # The host needs a client only for types and tests, so it generates just when none exists,
  # and never swaps the engine under the running dev server.
  if [ ! -f prisma/generated/prisma/index.d.ts ]; then
    pnpm -s prisma:generate >/dev/null \
      || warn "host 'pnpm prisma:generate' failed: typecheck and tests on the host need the Prisma client"
  fi
}

app_image() {
  local id
  id="$(compose ps -aq app 2>/dev/null | head -n1)"
  [ -z "$id" ] || docker inspect -f '{{.Config.Image}}' "$id"
}

# Creates the shared store volume, and drops the worktree's own store from before it (about
# 1 GB of root-owned files in the bind mount). With the volume mounted, .pnpm-store in the
# worktree is just an empty mountpoint, so a v11 directory there is the old store.
ensure_pnpm_store() {
  docker volume inspect "$PNPM_STORE_VOLUME" >/dev/null 2>&1 \
    || docker volume create "$PNPM_STORE_VOLUME" >/dev/null
  if [ -n "$(ls -A .pnpm-store 2>/dev/null)" ]; then
    echo "Removing this worktree's own pnpm store (now shared in volume $PNPM_STORE_VOLUME)..."
    compose stop app >/dev/null 2>&1 || true
    remove_root_owned "$ROOT" "$(app_image)" .pnpm-store
  fi
}

# The container runs as root, and host tools must be able to rewrite what it leaves in the
# bind mount: the Prisma client and tsc's incremental build info (typecheck via exec).
hand_back_files() {
  compose exec -T app sh -c "for p in /app/prisma/generated /app/tsconfig.tsbuildinfo; do [ ! -e \"\$p\" ] || chown -R $(id -u):$(id -g) \"\$p\"; done" \
    >/dev/null 2>&1 || true
}

print_info() {
  local host port mport admin agent
  host="$(env_value TRAEFIK_HOST)"
  port="$(compose port app 3000 2>/dev/null | sed -E 's/.*://' || true)"
  mport="$(compose port mailpit 8025 2>/dev/null | sed -E 's/.*://' || true)"
  admin="$(env_value SOLILOAN_ADMIN_EMAIL)"
  agent="$(env_value SOLILOAN_DEV_AGENT_EMAIL)"
  echo
  echo "Project:   $PROJECT"
  echo "App:       https://$host"
  echo "MCP:       http://127.0.0.1:${port:-?}/_next/mcp"
  echo "Mailpit:   http://127.0.0.1:${mport:-?}"
  echo "Admin:     ${admin:-see .env} (password: SOLILOAN_ADMIN_PASSWORD in .env)"
  # Defaults as in prisma/seed.ts (src/lib/seed/dev-seed.ts) when .env lacks the keys.
  echo "Agent:     ${agent:-agent@dev.local} (password: SOLILOAN_DEV_AGENT_PASSWORD in .env, default agent-dev-password)"
}

http_code() { curl -ks -o /dev/null -m "${2:-10}" -w '%{http_code}' "${@:3}" "$1" || true; }

# Polls https://<host> through Traefik. Once the app answers on its own port but Traefik
# still does not route to it after ROUTE_GRACE_SECONDS, it fails at once instead of waiting.
wait_ready() {
  local host deadline code port app_code routed_since=""
  host="$(env_value TRAEFIK_HOST)"
  deadline=$((SECONDS + WAIT_SECONDS))
  echo "Waiting for https://$host (first start installs dependencies, pushes the schema and seeds; can take minutes)..."
  while [ "$SECONDS" -lt "$deadline" ]; do
    code="$(http_code "https://$host/" 120 --resolve "$host:443:127.0.0.1")"
    case "$code" in 2*|3*) echo "Ready (HTTP $code)."; return 0 ;; esac
    if [ -z "$(compose ps --status running --services 2>/dev/null | grep -x app || true)" ]; then
      compose logs --tail 40 app || true
      die "app container is not running"
    fi
    [ -n "$(running_traefik)" ] || die "Traefik stopped while waiting (HTTP ${code:-none} for https://$host); see 'docker compose -p $TRAEFIK_PROJECT logs'"
    port="$(compose port app 3000 2>/dev/null | sed -E 's/.*://' || true)"
    app_code="$([ -n "$port" ] && http_code "http://127.0.0.1:$port/" 120)"
    case "$app_code" in
      2*|3*)
        routed_since="${routed_since:-$SECONDS}"
        if [ $((SECONDS - routed_since)) -ge "$ROUTE_GRACE_SECONDS" ]; then
          die "the app answers on http://127.0.0.1:$port (HTTP $app_code) but Traefik does not route https://$host (HTTP ${code:-none}). Check that Traefik has ports 80/443 ('docker ps --filter name=traefik') and is on network $TRAEFIK_NETWORK, and that *.$BASE_DOMAIN resolves to 127.0.0.1."
        fi
        ;;
    esac
    sleep 5
  done
  compose logs --tail 40 app || true
  die "timed out after ${WAIT_SECONDS}s waiting for https://$host (HTTP ${code:-none})"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  up)
    SLUG="$(resolve_slug "${1:-}")"
    PROJECT="soliloan-$SLUG"
    write_env "$SLUG"
    ensure_traefik
    install_host_deps
    ensure_pnpm_store
    compose up -d --build
    wait_ready
    hand_back_files
    print_info
    ;;
  url)
    PROJECT="$(env_value COMPOSE_PROJECT_NAME)"; [ -n "$PROJECT" ] || die "no stack here yet; run 'up' first"
    print_info
    ;;
  logs)
    PROJECT="$(env_value COMPOSE_PROJECT_NAME)"; [ -n "$PROJECT" ] || die "no stack here yet; run 'up' first"
    compose logs -f "${1:-app}"
    ;;
  exec)
    PROJECT="$(env_value COMPOSE_PROJECT_NAME)"; [ -n "$PROJECT" ] || die "no stack here yet; run 'up' first"
    [ "$#" -gt 0 ] || die "usage: exec <command...>"
    # No TTY here: pnpm aborts (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY) when it wants to
    # reinstall node_modules before a script. CI=true lets it do so without asking.
    rc=0
    compose exec -T -e CI=true app "$@" || rc=$?
    hand_back_files
    exit "$rc"
    ;;
  down)
    PROJECT="$(env_value COMPOSE_PROJECT_NAME)"; [ -n "$PROJECT" ] || die "no stack here yet; nothing to remove"
    # The container runs as root and writes .next, prisma/generated and the store mountpoint
    # into the bind mount, which would block `git worktree remove`. Stop the dev server first,
    # otherwise it recreates the directories while we delete them.
    compose stop app >/dev/null 2>&1 || true
    remove_root_owned "$ROOT" "$(app_image)"
    compose down -v --remove-orphans
    echo "Removed $PROJECT (containers, network, DB volume). Shared Traefik and the shared pnpm store ($PNPM_STORE_VOLUME) stay."
    ;;
  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    [ -z "$cmd" ] || exit 1
    ;;
esac
