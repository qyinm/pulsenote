# PulseNote Site

Public product site for PulseNote.

This app owns the marketing landing page, brand presentation, access-state messaging, and entry points into the wider PulseNote product surface.

## What This Site Does

- Explains PulseNote as a release communication system, not a generic AI writer
- Shows the release workflow: collect, draft, check, approve, export
- Presents current access paths such as `Start Free` and `Coming Soon` states
- Links users into future hosted product surfaces without overstating what is already available

## Product Frame

- Inputs:
  GitHub release evidence, Slack coordination notes, attached rollout files
- Flow:
  collect, draft, check, approve, export
- Outputs:
  external release notes, internal deployment briefs, release-derived stakeholder updates

The landing page should keep that release communication story clear. It should not drift into a generic AI writer, broad content studio, or vague productivity pitch.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4

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

Open [http://localhost:3000](http://localhost:3000).

## Current Routes

- `/`: landing page
- `/coming-soon`: placeholder access page for surfaces that are not yet open

## Deployment Notes

- The site is deployed separately from future app surfaces such as `apps/web`
- Vercel should treat this app as its own project/root directory
- Access CTAs must stay honest: if a surface is not live, route to a clearly labeled placeholder state

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

In restricted sandbox environments, `pnpm build` can fail because Turbopack tries to bind an internal port. In that case, use:

```bash
./node_modules/.bin/next build --webpack
```

## Important Files

- `src/app/page.tsx`
  Landing page structure, CTA logic, and section messaging
- `src/app/coming-soon/page.tsx`
  Placeholder access page for not-yet-open product surfaces
- `src/app/globals.css`
  Visual system, layout rules, and component styling
- `src/app/layout.tsx`
  Metadata, favicon wiring, and root layout

## Editing Guidance

- Keep copy precise and operational.
- Anchor every promise to the release communication workflow.
- If a CTA cannot lead to a real surface yet, send users to a clearly labeled placeholder page.
- Prefer concrete inputs, guardrails, and outputs over vague AI language.
