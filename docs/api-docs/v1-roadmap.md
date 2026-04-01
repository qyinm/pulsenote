# V1 Roadmap

This roadmap sequences backend work so PulseNote can move from sample dashboard data to real release communication records.

## Guiding principle

The next feature is not "build the agent first." The next feature is "build real release intake and persistent workflow state." Agent features should follow that foundation.

## Confirmed defaults

- Runtime: `Hono + Node`
- Database: `Postgres + Drizzle`
- Deployment target: `Railway`
- Auth direction: `better-auth` with authenticated users and workspace memberships

## Milestone 1. Add `apps/api` or an equivalent backend surface

### Outcome

There is a real backend package in the workspace, not just an empty directory.

### Deliverables

- package manifest,
- TypeScript config,
- runtime entry point,
- health route,
- environment loading strategy,
- basic error handling and request logging.

## Milestone 2. Add workspace, auth, and integration schema

### Outcome

PulseNote can persist users, workspaces, memberships, integrations, and sync history.

### Deliverables

- `user`,
- `workspace`,
- `workspace_membership`,
- `integration_connection`,
- `integration_account`,
- `sync_run`,
- `source_cursor`.

## Milestone 3. Add GitHub ingest endpoint and dev-only sync trigger

### Outcome

A developer can pull real GitHub release evidence into PulseNote without waiting for finished integration UI.

### Deliverables

- internal GitHub ingest route,
- PAT or installation-token based auth path,
- repo plus compare-range ingest,
- merged PR list ingest,
- release or tag ingest,
- persisted sync run records.

## Milestone 4. Normalize release records, evidence, and claim state

### Outcome

GitHub data is stored in a product-specific record shape instead of raw provider payloads.

### Deliverables

- `release_record`,
- `evidence_block`,
- `claim_candidate`,
- `source_link`,
- `review_status`,
- mapping rules from GitHub payloads into these records.

## Milestone 5. Render real synced data in `apps/web`

### Outcome

The current sample dashboard becomes a real workflow surface backed by stored release records.

### Deliverables

- release context page reads synced records,
- review reads claim candidates, evidence blocks, and stored review state,
- inbox reads actual queue pressure from persisted workflow state,
- publish pack reflects stored release data instead of sample fixtures.

## Milestone 6. Add agent draft and review on stored records

### Outcome

Drafting and review operate on stable, reviewable inputs.

### Deliverables

- draft generation input contract,
- review input contract,
- record-backed prompt context,
- persisted outputs tied to release records,
- visible source trace from generated output back to evidence.

## Milestone 7. Add Linear enrichment

### Outcome

Release records gain better ownership and planning context without replacing GitHub as the evidence base.

### Deliverables

- linked Linear issue lookup,
- owner and milestone enrichment,
- rollout or customer impact notes,
- optional sync expansion for linked issues only.

## Recommended execution order

1. Make `apps/api` real.
2. Persist workspace and integration state.
3. Ingest GitHub data through a developer-friendly internal path.
4. Normalize that data into release records.
5. Point `apps/web` at stored records.
6. Add agents on top of stored records.
7. Add Linear enrichment after the evidence path is stable.
