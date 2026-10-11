# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional env: `DATABASE_URL` — Postgres connection string. Enables player stats and the leaderboard (tables are created on startup); without it the game runs and those features are hidden.
- Optional env: `SITE_URL` — public address of the site (e.g. `https://anime-guess-master.replit.app`), used to make the link-preview image URL absolute at build time.
- Optional env: `ALLOWED_ORIGINS` — comma-separated extra origins allowed by CORS (same-origin only by default).
- Optional env: `TRUSTED_PROXY_HOPS` — number of proxies in front of the API that append to `X-Forwarded-For` (default 1, Replit's proxy). The client IP is read from the right of that header, never the left (forgeable). On startup the server logs `Client IP taken from X-Forwarded-For` with the entry count, to check this setting.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
