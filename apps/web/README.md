# PulseNote Web App

Browser application for PulseNote.

This app is intended for the authenticated product surface: release records, review flows, approvals, and browser-based workflow management. It is separate from `apps/site`, which remains the public marketing and access-state surface.

## Purpose

- Own logged-in product flows
- Show release records and workflow state in the browser
- Support draft review, claim checks, approvals, and export handoff
- Evolve into the main hosted product surface behind `Start Free`

## Relationship To Other Apps

- `apps/site`
  Public landing page, branding, and coming-soon/access messaging
- `apps/web`
  Authenticated web product
- `apps/api`
  Backend API surface

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4

## Local Development

From the repo root:

```bash
pnpm install
pnpm --dir apps/web dev
```

From this package directly:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

From the repo root:

```bash
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

From this package directly:

```bash
pnpm lint
pnpm build
```

## Important Files

- `app/page.tsx`
  Current app entry page
- `app/layout.tsx`
  Root layout and metadata
- `app/globals.css`
  Web app styling baseline

## Editing Guidance

- Keep this app product-first, not marketing-first.
- Move user-facing access and placeholder messaging into `apps/site`.
- Use this surface for real workflow state once authentication and backend integration are ready.
