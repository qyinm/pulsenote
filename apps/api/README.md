# PulseNote API

Backend foundation for PulseNote.

This package starts with a small Hono + Node runtime so the product can move from sample dashboard data to real release intake, persisted workflow state, and reviewable agent inputs.

## Scripts

```bash
pnpm --dir apps/api dev
pnpm --dir apps/api build
pnpm --dir apps/api start
pnpm --dir apps/api typecheck
```

## Current scope

- Hono runtime and Node entry point
- health endpoint
- request logging and request IDs
- initial backend domain model types for workspace, integration, sync, and release records

Persistence, authentication, GitHub ingest, and Linear enrichment come next.
