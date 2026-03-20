# PulseNote API

Backend runtime for PulseNote's release communication workflow.

This package ingests release context from GitHub, persists reviewable release state, and serves the API surfaces that support claim check, approval, and publish-pack workflows.

## Scripts

```bash
pnpm --dir apps/api dev
pnpm --dir apps/api build
pnpm --dir apps/api start
pnpm --dir apps/api typecheck
```

## Docker deployment

If you want a deployment target that travels beyond Railway, build the API as a container from
the repository root:

```bash
docker build -f apps/api/Dockerfile -t pulsenote-api .
docker run --rm -p 8787:8787 --env-file /path/to/pulsenote-api.env pulsenote-api
```

This image is designed to work across container-friendly platforms such as Railway, Fly.io,
Render, ECS, and self-hosted runtimes. It keeps the PulseNote API focused on one release
communication backend surface instead of introducing provider-specific packaging.

## Railway deployment

PulseNote's hosted web app now depends on this API for auth onboarding, workspace access,
and live release context reads. Deploying `apps/api` to Railway is the right next step, but
the service needs three pieces to work together:

1. the service must listen on Railway's injected `PORT`
2. Better Auth must know the public API URL
3. cookie-backed CORS must trust the exact web origins

The repository now treats Docker as the primary deployment package. In Railway, point the
service at [apps/api/Dockerfile](./Dockerfile) instead of maintaining a separate
provider-specific config file.

### Recommended Railway setup

1. Create a new Railway service from this repository.
2. Keep the repository root as the working tree.
3. Configure the service to build from `apps/api/Dockerfile`.
4. Attach a Railway Postgres service and copy its `DATABASE_URL`.
5. Generate a public Railway domain for the API service.
6. Set the environment variables listed below.
7. Point `apps/web` at the API by setting `NEXT_PUBLIC_API_BASE_URL` to the same public URL.

### Required environment variables

See [.env.example](./.env.example) for a copyable template.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes | Set to `production` on Railway. |
| `DATABASE_URL` | yes | Postgres connection string for Better Auth and release-state persistence. |
| `BETTER_AUTH_SECRET` | yes | Long random secret used to sign auth state. |
| `BETTER_AUTH_URL` | yes | Public HTTPS URL for this API service, e.g. `https://api.pulsenotes.xyz`. |
| `BETTER_AUTH_COOKIE_DOMAIN` | recommended | Shared cookie domain for auth across subdomains, e.g. `.pulsenotes.xyz`. |
| `TRUSTED_ORIGINS` | yes | Comma-separated exact web origins allowed to send credentialed requests. No wildcard support. |
| `HOST` | optional | Defaults to `0.0.0.0` in production. Override only if Railway support asks for it. |
| `PORT` | optional | Railway injects this automatically. Keep it unset in normal deployments. |
| `APP_NAME` | optional | Structured logging label. Defaults to `pulsenote-api`. |

### Database migrations

The API already includes generated SQL migrations under [drizzle/](./drizzle/), but the
repository does not yet ship an automated Railway migration runner. Before opening public
traffic, apply the SQL files in order against the Railway Postgres database.

At minimum, make sure the target database has the schema from:

- `apps/api/drizzle/0000_flat_wind_dancer.sql`
- `apps/api/drizzle/0001_powerful_skin.sql`
- `apps/api/drizzle/0002_messy_sunspot.sql`
- `apps/api/drizzle/0003_powerful_silver_samurai.sql`
- `apps/api/drizzle/0004_magenta_satana.sql`
- `apps/api/drizzle/0005_broken_patriot.sql`

### CORS and auth notes

- `TRUSTED_ORIGINS` must list the exact browser origins that call this API, because the API
  uses credentialed requests for Better Auth sessions.
- `BETTER_AUTH_URL` should match the final public API URL exactly, including `https://`.
- If the web app runs on `app.pulsenotes.xyz` and the API runs on `api.pulsenotes.xyz`, set
  `BETTER_AUTH_COOKIE_DOMAIN=.pulsenotes.xyz` so Better Auth can share session cookies across
  those subdomains.
- If you deploy preview web environments on different domains, add those preview origins
  explicitly or route preview traffic through a single stable web origin.

## Current scope

- Hono + Node runtime for the hosted PulseNote API
- health endpoint, request IDs, and structured request logging
- workspace, membership, integration, sync-run, and release-record persistence
- Better Auth session handling for hosted workspace access
- GitHub intake routes for compare ranges, merged pull requests, and releases
- stored release records, evidence blocks, claim candidates, source links, and review status snapshots

The API currently focuses on evidence-first release context intake so downstream draft, claim-check, approval, and publish-pack surfaces can stay reviewable.
