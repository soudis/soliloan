---
trigger: always_on
---

---
description: Rules and guardrails for Docker setup in Soliloan
globs: docker/**/*, Dockerfile, docker-compose.yml, compose.yml
---

# Docker Setup Overview

The project uses a modular Docker Compose architecture.
- **Root Compose Files**: `docker/compose.dev.yml`, `docker/compose.staging.yml`.
- **Top-level Strategy**: Uses the `include` directive to aggregate service-specific compose files.
- **Services**: Each service (`app`, `postgres`, `traefik`) has its own subdirectory in `docker/`.

# File Structure Rules

- **Location**: All Docker configuration must be in the `docker/` directory.
- **Service Modules**:
  - Each service has a dedicated folder (e.g., `docker/app`, `docker/postgres`).
  - **Base Config**: `compose.base.yml` (Common configuration).
  - **Overrides**: `compose.override.{env}.yml` (Environment-specific: `dev`, `staging`, `prod`).

# Development Workflow

- **Command**: Run dev environment using:
  ```bash
  docker compose -f docker/compose.dev.yml --project-directory . up
  ```
- **App Service**:
  - Uses `target: base` from the multi-stage Dockerfile.
  - Mounts local directory to `/app` for hot-reloading.
  - **Startup Command**: `pnpm install && pnpm prisma db push && pnpm prisma db seed && pnpm dev`.
- **Environment**:
  - `NODE_ENV=development`
  - Uses `soliloan.localhost` domain via Traefik.

# Networking & Traefik

- **Reverse Proxy**: Traefik handles routing via Docker labels.
- **Networks**:
  - `traefik_network`: External network for routing.
  - `backend_network`: Internal network for app-db communication.
- **Labels**:
  - `traefik.enable=true`
  - `traefik.http.routers.{name}.rule=Host(...)`
  - `traefik.http.routers.{name}.entrypoints=websecure`

# Database

- **Service**: `postgres` (in `docker/postgres`).
- **Persistence**: `directloan-db` volume.
- **Initialization**: Handled via environment variables (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).

# Modifications

- **Adding Services**: Create a new folder in `docker/` with `compose.base.yml` and include it in the root compose files.
- **Environment Variables**: Use `.env` file in the project root (referenced automatically or explicitly).
- **Images**: App images are tagged with `DOCKER_IMAGE_TAG` env var.
