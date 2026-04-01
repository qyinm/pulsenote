# Backend Foundation

## Goal

Create the minimum backend needed for PulseNote to ingest real release evidence, persist workflow state, and support reviewable drafting.

This foundation should support the product flow defined in `SOUL.md`:

1. ingest release context,
2. draft public communication,
3. run safety checks,
4. collect approval,
5. export publish pack.

## Confirmed implementation choices

- API runtime: `Hono + Node`
- database: `Postgres + Drizzle`
- deployment target: `Railway`
- auth provider: `better-auth`
- hosted auth model: `user + workspace_membership`

These choices mean the next backend slices should optimize for a long-running Node service, explicit relational schema design, and membership-aware route access instead of a dev-only single-workspace shortcut.

## 1. Workspace, Auth, and Integration model

The first backend milestone is a persistent model for users, workspaces, integrations, and sync runs.

Without this layer:

- GitHub and Linear can be connected only ephemerally,
- the web app cannot keep workflow state across sessions,
- release records cannot accumulate evidence over time,
- approval and review history cannot be reconstructed reliably.

### Minimum entities

- `user`
  The authenticated person using PulseNote.
- `workspace`
  The release communication workspace that owns records, rules, and integrations.
- `workspace_membership`
  Maps users to workspaces with an explicit role.
- `integration_connection`
  Represents a connected provider such as GitHub or Linear.
- `integration_account`
  Stores provider installation or account identity metadata tied to a connection.
- `sync_run`
  Tracks each import attempt, status, scope, started time, finished time, and failures.
- `source_cursor`
  Stores incremental sync checkpoints such as last synced PR, tag, or timestamp.

### Minimum responsibilities

- persist which user belongs to which workspace,
- persist which workspace has which connected providers,
- persist sync scope and failures,
- make provider state auditable instead of implicit.

## 2. GitHub ingest MVP

Build GitHub ingest before Linear.

### Why GitHub comes first

PulseNote needs the strongest available evidence for what actually shipped. GitHub provides the primary signals:

- merged pull requests,
- commits,
- compare ranges,
- releases and tags,
- changed files,
- linked issue references embedded in code and PR metadata.

GitHub answers the core product question: "What changed and what evidence supports the public wording?"

Linear is still useful, but it is a weaker source of shipped truth. It mostly enriches context, planning intent, ownership, and milestone framing.

### GitHub MVP scope

- connect one repository or installation to one workspace,
- ingest merged PRs for a selected compare range or release window,
- collect commit metadata and changed file summaries,
- capture release and tag metadata when present,
- extract linked issue references from PRs and commit messages,
- write normalized release records and evidence blocks.

## 3. Dev ingest path

Do not wait for polished OAuth and settings UI before ingesting real data.

Create a development-only ingest path first so the team can build on real repository data:

- PAT-based GitHub access for a known repo,
- or GitHub App installation token for a known installation,
- internal trigger by repo plus compare range,
- internal trigger by merged PR list,
- internal trigger by release tag or release ID.

This path can be operationally ugly as long as it is explicit and safe. The goal is to unblock:

- backend normalization,
- real release record rendering,
- agent development on stored data,
- claim check tuning against actual shipped evidence.

## 4. Normalized release record

Do not drive PulseNote directly from raw GitHub payloads.

Persist a normalized model that the review workflow can trust.

### Core record set

- `release_record`
  The workspace-owned unit of release communication work.
- `evidence_block`
  A source-backed fact cluster pulled from PRs, commits, releases, specs, or tickets.
- `claim_candidate`
  A draftable customer-facing sentence or proposition derived from evidence.
- `source_link`
  The exact pointer back to the original evidence source.
- `review_status`
  The current workflow state for claim check, approval, and publish readiness.

### Why normalization matters

- claim check should read stable facts, not provider-shaped payloads,
- approval should reference release records and evidence blocks, not ad hoc API calls,
- publish pack generation should work from one consistent record,
- later enrichment from Linear should attach cleanly to the same record shape.

## 5. Agents run on stored records

Agent work should begin after normalized release records exist.

### Why this order matters

- live provider payloads are noisy and inconsistent,
- direct API-to-agent flows are hard to reproduce,
- reviewability drops when the source data can shift between runs,
- approval becomes harder to audit when inputs are not persisted.

### Expected agent inputs

- release record summary,
- linked evidence blocks,
- extracted claim candidates,
- current review status,
- workspace rules and export constraints.

This keeps drafting and claim checks grounded in a stable record that humans can inspect later.

## 6. Linear enrichment comes after GitHub

Linear should strengthen context after the GitHub ingest path is working.

### Good Linear enrichment targets

- linked issue titles,
- owner and team context,
- milestone or cycle information,
- rollout notes,
- customer impact notes,
- implementation intent that helps interpret shipped work.

### Why it comes later

GitHub is evidence for shipped facts.
Linear is context that improves interpretation.

PulseNote needs evidence first, then enrichment.
