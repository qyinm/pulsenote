# PulseNote

PulseNote is a release communication system. It turns release evidence into reviewable, approval-ready communication without drifting away from shipped facts.

## Workspace

- `apps/site`: public site for the landing page, download entry points, and links into the web product
- `SOUL.md`: product source of truth
- `AGENTS.md`: contributor guardrails for this workspace

## Local Development

Install workspace dependencies from the repo root:

```bash
pnpm install
```

Install `just` before using the root command surface:

```bash
brew install just
# or
cargo install just --locked
```

Use `just` as the canonical root entrypoint:

```bash
just --list
```

Common workflows:

```bash
just dev           # start the web app
just api-dev       # run the API separately
just check
just web-test
just web-typecheck
just api-test
just api-typecheck
just api-db-generate
just api-db-migrate
just site-dev
```

The default root workflow is product-first: it prioritizes `apps/web` and `apps/api`, while `apps/site` remains available through explicit app-scoped recipes.

App-local `package.json` scripts remain the execution substrate. Root `package.json` scripts are transitional only and should not be treated as the primary workflow surface.

## Notes

- The site is the public product entry point. It can route users to the web application and offer GUI downloads.
