# PulseNote Site

Public landing site for PulseNote.

This app presents PulseNote as a release communication system. It should stay focused on the release flow: ingest context, draft customer-facing communication, run claim checks, collect approval, and export a publish pack.

## Stack

- Astro
- TypeScript
- Plain CSS

## Routes

- `/`: landing page
- `/coming-soon`: placeholder access page

## Local Development

From the repo root:

```bash
pnpm install
pnpm dev
```

From this package directly:

```bash
pnpm dev
```

## Validation

From the repo root:

```bash
pnpm lint
pnpm build
```

From this package directly:

```bash
pnpm lint
pnpm build
```

## Editing Guidance

- Keep copy precise, calm, and operational.
- Anchor promises to release communication outcomes.
- Do not position PulseNote as a generic AI writer.
- Keep placeholder routes clearly labeled when a hosted surface is not open yet.
