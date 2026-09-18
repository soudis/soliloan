<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Docker development (host vs container)

The documented workflow is `pnpm docker:dev up`, not host `pnpm dev`. Next.js runs inside the `app` container (`WORKDIR /app`). Keep these surfaces distinct:

- **Browser / `agent-browser`:** `https://soliloan.localhost` (Traefik). Auth cookies and `NEXTAUTH_URL` are bound to that host. Do not drive the UI at `http://localhost:3000`.
- **Next.js MCP** (`/_next/mcp`, `next-devtools-mcp`, `next-dev-loop` probes): `http://localhost:3000/_next/mcp`. Compose publishes container port 3000 to host loopback so auto-discovery works. If the probe is unreachable, Docker is not up (or port 3000 is taken) — do not assume Next.js is below 16.3.
- **Workspace paths:** MCP tools such as `get_logs` and `get_project_metadata` return container paths under `/app`. Map `/app/...` to the same path under this repository root. `.next` is bind-mounted; `node_modules` is not (anonymous volume).
- **Bundled docs:** Agents read `node_modules/next/dist/docs/` on the host. Run `pnpm install` on the host so that tree exists; the container's `node_modules` is not visible here.
