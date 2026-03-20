# Web Release Context Live Data TODO

Use this checklist for the `feat/web-release-context-live-data` branch only.

Scope guard:

- This branch exists to make one authenticated, reviewable release-context screen use stored API data.
- Keep the slice narrow: auth/session plumbing, workspace resolution, and release-context live reads only.
- Do not expand this branch into inbox, claim check, approval, publish pack, or general dashboard rewrites.

## Essential integration tasks

- [x] Add the minimum `apps/web` runtime config needed to call `apps/api` from the authenticated product surface.
- [x] Add Better Auth client helpers in `apps/web` for browser and server session reads.
- [x] Add an authenticated API route that resolves the current workspace for the signed-in user.
- [x] Add an explicit dashboard auth gate for signed-out and no-membership states.
- [x] Replace the `Sample workspace` header state with the current workspace resolved from the authenticated API session.
- [x] Fetch release record list data from `GET /v1/workspaces/:workspaceId/release-records`.
- [x] Fetch selected release record detail from `GET /v1/workspaces/:workspaceId/release-records/:releaseRecordId`.
- [x] Map stored release-record data into the release-context metrics, queue table, and selected side panel.
- [x] Add loading, empty, and error states that keep evidence and review state explicit.

## Validation

- [x] Verify the release-context page still matches the release communication workflow in `SOUL.md`.
- [x] Run `pnpm --dir apps/web lint`.
- [x] Run `pnpm --dir apps/web build`.
