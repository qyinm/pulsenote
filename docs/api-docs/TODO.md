# API TODO Checklist

Use this file as the running backend checklist for PulseNote.

Rule:

- Update the checkbox state whenever a task is completed.
- Prefer small, reviewable increments over broad status changes.
- Keep each checked item tied to a real code or schema change.

## Planning and setup

- [x] Write backend foundation notes for real release intake.
- [x] Write a V1 backend roadmap from API setup to Linear enrichment.
- [x] Decide the backend runtime for `apps/api` (`Hono + Node`).
- [x] Decide the deployment target for `apps/api` (`Railway`).
- [x] Create a real `apps/api` package with manifest, TypeScript config, and runtime entry point.
- [x] Add a health endpoint and baseline request logging.

## Workspace, auth, and integration foundation

- [x] Define the minimum data model for `user`, `workspace`, and `workspace_membership`.
- [x] Define the minimum data model for `integration_connection`, `integration_account`, `sync_run`, and `source_cursor`.
- [x] Add a persistence-ready Drizzle schema for the first workspace and integration tables.
- [x] Decide to use `better-auth` with `user + membership` based access.
- [x] Add `better-auth` configuration, auth routes, and session handling.
- [x] Add database-backed auth tables and connect them to application users.
- [x] Add persistent storage for workspace and integration state.
- [x] Add API routes for workspace bootstrap, workspace snapshots, integration creation, and sync-run creation.
- [x] Add membership-aware access control for workspace routes.

## GitHub ingest MVP

- [x] Define the initial GitHub connection scope for one workspace and one repository or installation.
- [x] Add a development-only GitHub ingest path using a PAT or installation token.
- [x] Add a sync trigger for repo plus compare range.
- [ ] Add a sync trigger for merged PR list.
- [ ] Add a sync trigger for release tag or release ID.
- [x] Persist sync run status, scope, timing, and failure details.

## Normalized release records

- [x] Define the normalized model for `release_record`.
- [x] Define the normalized model for `evidence_block`.
- [x] Define the normalized model for `claim_candidate`.
- [x] Define the normalized model for `source_link`.
- [x] Define the normalized model for `review_status`.
- [x] Add a persistence-ready Drizzle schema for normalized release record tables.
- [x] Map GitHub raw payloads into normalized release records and evidence blocks.

## Web app integration

- [x] Add release record list and detail routes for stored intake data.
- [ ] Replace sample release context data with stored records.
- [ ] Replace sample claim check data with stored claim candidates and evidence blocks.
- [ ] Replace sample approval data with stored review state.
- [ ] Replace sample inbox data with persisted queue state.
- [ ] Replace sample publish pack data with stored release export state.

## Agent foundation

- [ ] Define the stored-record input contract for draft generation.
- [ ] Define the stored-record input contract for claim check.
- [ ] Persist generated draft outputs against a release record.
- [ ] Persist claim check outputs with source trace.

## Linear enrichment

- [ ] Define the minimum linked Linear issue fields needed for enrichment.
- [ ] Add Linear enrichment for owner, milestone, and customer impact context.
- [ ] Keep Linear enrichment optional and secondary to GitHub evidence.
