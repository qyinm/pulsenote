# PulseNote API Docs

This directory tracks the backend foundation needed to move PulseNote from sample workflow state to real release communication data.

## Why this exists

PulseNote is a release communication system. The next backend step is not generic agent work. It is a release intake foundation that can:

1. persist workspace and user state,
2. connect source systems,
3. ingest shipped evidence,
4. normalize that evidence into release records,
5. feed reviewable drafting and claim checks.

Without this layer, the web app remains a sample UI and the agent has no durable, reviewable input.

## Current state

- `apps/web` contains sample workflow surfaces for release context, claim check, approval, inbox, and publish pack.
- `apps/api` now exists as a small Hono + Node backend package with a health endpoint, request logging, and initial domain model types.
- Real authentication, integration state, sync runs, and release records are not yet stored anywhere in this repository.

## Core decisions

- Build the authenticated workspace and integration foundation before agent workflows.
- Ingest GitHub first because shipped work is the primary evidence source.
- Treat Linear as enrichment after GitHub ingest is stable.
- Store normalized release records instead of driving the product directly from raw provider payloads.
- Run agents on stored records so outputs remain reproducible and reviewable.

## Documents

- [Backend Foundation](./backend-foundation.md)
  Explains the minimum model, ingest order, and normalized record shape.
- [V1 Roadmap](./v1-roadmap.md)
  Breaks the backend work into milestones from API setup to Linear enrichment.
- [TODO Checklist](./TODO.md)
  Tracks the backend work items that should be checked off as implementation progresses.

## Working rule

When backend tradeoffs appear, prefer the option that keeps evidence, wording, and approval trace inspectable in one release workflow.
