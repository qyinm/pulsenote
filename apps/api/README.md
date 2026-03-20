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

## Current scope

- Hono + Node runtime for the hosted PulseNote API
- health endpoint, request IDs, and structured request logging
- workspace, membership, integration, sync-run, and release-record persistence
- Better Auth session handling for hosted workspace access
- GitHub intake routes for compare ranges, merged pull requests, and releases
- stored release records, evidence blocks, claim candidates, source links, and review status snapshots

The API currently focuses on evidence-first release context intake so downstream draft, claim-check, approval, and publish-pack surfaces can stay reviewable.
