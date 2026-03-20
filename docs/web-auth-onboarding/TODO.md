# Web Auth Onboarding TODO

## Scope guard
- This slice is only for getting a real user into the PulseNote web app with an authenticated workspace context.
- Keep the work tied to the release workflow: sign in, join or create a workspace, choose the current workspace, then enter the dashboard.
- Do not expand this branch into GitHub connection management, release sync UI, inbox polish, or broader dashboard redesign.

## Essential tasks
- [x] Add a minimal Better Auth sign-in page for the web app.
- [x] Add a minimal Better Auth sign-up page for the web app.
- [x] Add a signed-out dashboard CTA that sends users into the auth flow instead of stopping at a static empty state.
- [x] Add an API route that bootstraps a workspace for the currently authenticated user instead of creating a detached sample user.
- [x] Add a first-run onboarding screen for users who have no workspace membership yet.
- [x] Add a current-workspace selection model so multi-workspace users do not hit the `selection-required` dead end.
- [x] Add a workspace selection UI for users who belong to multiple workspaces.
- [x] Persist the chosen current workspace and make `/v1/workspaces/current` resolve from that explicit selection.
- [x] Route successful onboarding back into the release workflow, starting with `release-context`.

## Validation
- [x] `pnpm --dir apps/api test`
- [x] `pnpm --dir apps/api typecheck`
- [x] `pnpm --dir apps/api build`
- [x] `pnpm --dir apps/web test`
- [x] `pnpm --dir apps/web typecheck`
- [x] `pnpm --dir apps/web lint`
- [x] `pnpm --dir apps/web build`
