# Anchra Landing

Marketing site for Anchra, an anchored release communication system that turns GitHub releases, Slack decisions, and release files into review-ready communication packs.

## Product Frame

- Input: GitHub release evidence, Slack coordination notes, attached rollout files
- Flow: collect, draft, check, approve, export
- Output: external release notes, internal deployment briefs, release-derived stakeholder updates

The landing page should keep that anchored release story clear. It should not drift into a generic AI writer or broad content studio pitch.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
pnpm lint
pnpm build
```

In restricted sandbox environments, `pnpm build` can fail because Turbopack tries to bind an internal port. In that case, use:

```bash
pnpm exec next build --webpack
```

## Important Files

- `src/app/page.tsx`: landing page message architecture and sections
- `src/app/globals.css`: visual system and layout styling
- `src/app/layout.tsx`: metadata and root layout

## Editing Guidance

- Keep copy precise and operational.
- Anchor every promise to the release communication workflow.
- Prefer concrete inputs, guardrails, and outputs over vague AI language.
