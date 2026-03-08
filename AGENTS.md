# AGENTS.md

This file defines how human and AI contributors should work in the Anchra workspace.
Scope: this repository

## Source of truth
Read `SOUL.md` first.
If a requested change conflicts with the product soul, reshape the change toward the soul instead of blindly implementing it.

## Product identity
Anchra is a release communication system.
It is not a generic writing app, content studio, scheduler, or creator suite.

Every meaningful feature should reinforce this operating flow:
1. ingest release context
2. draft public communication
3. run safety checks
4. collect approval
5. export publish pack

## Decision guardrails
1. Evidence first
   - Avoid unsupported claims in copy, docs, UI, and generated output.
2. Safety first
   - Prefer explicit checks and visible warnings over silent assumptions.
3. Reviewable decisions
   - Keep wording changes, approvals, and evidence trace easy to inspect.
4. Practical simplicity
   - Choose a clear release workflow over broad but vague flexibility.

## Workspace map
- `apps/site/`
  - Public product site.
  - Owns the landing page, download entry points, and links into the web product.
  - Treat this as a deployable site, not as passive docs content.
- `SOUL.md`
  - Product mission, scope, and non-negotiables.
- `README.md`
  - Root developer entry point for the monorepo.

## Site expectations
- Keep messaging precise, calm, and operational.
- Anchor every promise to release communication outcomes.
- Do not market Anchra as a generic AI assistant.
- If the site mentions web app entry or GUI download, keep those paths concrete and non-hyped.
- Label mock product states clearly as sample or demo.

## Naming rules
- Name features by user outcome, not model internals.
- Prefer terms like `release context`, `claim check`, `approval`, `publish pack`.
- Avoid vague AI feature labels unless the user-facing action is still obvious and release-specific.

## Validation
Before considering a task done:
1. The output still aligns with `SOUL.md`.
2. The release communication flow becomes clearer, not broader.
3. Claims stay concrete and non-inflated.
4. Technical checks pass for the touched project.

Recommended checks:
- Site: `pnpm lint`, `pnpm build`

## What to avoid
- Turning Anchra into a generic writer, scheduler, or creator platform
- Marketing language that implies unverified outcomes
- UX that hides evidence, risks, or approval responsibility
- Feature additions that do not strengthen the release communication workflow

## Prioritization
When tradeoffs appear, prioritize in this order:
1. trust and correctness
2. reviewability and safety
3. speed
4. visual polish
