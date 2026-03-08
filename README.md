# Anchra

Anchra is a release communication system. It turns release evidence into reviewable, approval-ready communication without drifting away from shipped facts.

## Workspace

- `apps/site`: public site for the landing page, download entry points, and links into the web product
- `apps/cli`: Go CLI for collecting release context and generating release-derived drafts
- `SOUL.md`: product source of truth
- `AGENTS.md`: contributor guardrails for this workspace

## Local Development

Install the site dependencies from the repo root:

```bash
pnpm install
```

Run the public site:

```bash
pnpm dev
```

Run the CLI from the repo root:

```bash
pnpm cli -- --help
```

Validate the current surfaces:

```bash
pnpm lint
pnpm build
pnpm test:cli
```

## Notes

- The site is the public product entry point. It can route users to the web application and offer GUI downloads.
- The CLI remains focused on release context intake and draft generation, not generic writing workflows.
