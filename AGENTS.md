# AGENTS.md

This file defines how human and AI contributors should work in the Anchra workspace.
Scope: `/Users/hippoo/Desktop/01_projects/05_zero2one/Pulsenote`

## Source of truth
Read `SOUL.md` first. If a task conflicts with the product soul, adjust the task toward the soul.

## Product focus
Anchra is a release communication system, not a generic content app.

Always optimize for this flow:
1) ingest release context,
2) draft public communication,
3) run safety checks,
4) collect approval,
5) export publish pack.

## Decision guardrails
1. Evidence first
   - Avoid unsupported claims in copy, docs, or product UI.
2. Safety first
   - Prefer explicit risk checks over silent assumptions.
3. Reviewable decisions
   - Changes should be easy to audit and reason about.
4. Practical simplicity
   - Choose clear flows over flexible but vague abstractions.

## What to avoid
- Turning the product into a generic writer, scheduler, or creator suite
- Marketing language that implies unverified outcomes
- Feature additions with no relation to release communication workflow

## Workspace map
- `apps/site/`: public product site, landing narrative, download entry point
- `apps/cli/`: release communication CLI for intake and draft generation
- Future app/backend repos should follow this same product identity unless explicitly superseded

## Implementation expectations
- Keep copy and UX anchored to B2B release communication jobs
- Name features by user outcome, not model internals
- If mock data is used, label it clearly as sample/demo
- Preserve consistency between hero promise and actual feature scope

## Quality bar
Before considering a task done:
1. The output aligns with `SOUL.md`
2. The release communication flow is clearer, not broader
3. Claims are concrete and non inflated
4. Technical checks pass for the touched project

## Prioritization rule
When tradeoffs appear, prioritize in this order:
1) trust and correctness,
2) reviewability and safety,
3) speed,
4) visual polish.
