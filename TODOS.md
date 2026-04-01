# TODOs

- [x] Approval Assignment And Reviewer Handoff

- [x] PR 1: Approval Assignment And Reviewer Handoff
  Scope:
  Add explicit reviewer assignment to the `request approval` step so PulseNote can show who requested approval, who now owns the review, and which release record is waiting on that handoff.

- [ ] PR 2: Review Ownership Filters And Inbox Cues
  Scope:
  Add queue views such as `assigned to me`, `requested by me`, and `unassigned`, then surface lightweight in-product ownership cues so reviewers can see which review records need their attention first.

- [ ] PR 3: In-Product Review Notifications
  Scope:
  Add notification events for review requested, draft reopened, and review blockers so PulseNote can surface the next reviewer action inside the product before adding email or Slack delivery.

What:
Add explicit reviewer assignment to the `request approval` step so PulseNote can show who requested approval, who now owns the review, and which release record is waiting on that handoff.

Why:
The founder workflow now has a real state machine, audit history, review log, and selected-release recent history. What is still missing is the operational handoff from "approval requested" to "this reviewer is now on the hook." Without that, approval stays visible in the database but not clearly owned by a human reviewer.

Pros:
- Turns approval from a passive pending state into an explicit handoff.
- Reinforces PulseNote's accountability model before adding noisy notification channels.
- Makes the approval queue more operational by showing requester, assignee, and ownership state.

Cons:
- Requires new API and UI surface for reviewer selection and ownership display.
- Forces a decision about the first assignment model before external notifications exist.
- Adds more workflow detail to the approval surface and selected release detail.

Context:
PRs #11 through #13 completed the workflow history read model, review log real-data conversion, and recent history surface inside the selected release detail. That work made decisions reviewable, but it did not answer who currently owns a pending approval. The current founder-path implementation still stores approval as a state change without a clear reviewer handoff, so this TODO captures the next step needed to make the approval stage operational instead of merely visible.

Depends on / blocked by:
- Depends on the existing founder workflow command endpoints and history read model being in place.
- Depends on reusing or extending `review_statuses.owner_user_id` to represent the current approval assignee.
- Blocked by choosing the first reviewer source, likely current workspace membership, before adding any notification channel.

- [ ] Reviewer Notification And Assignment Automation

What:
Add reviewer notification and assignment automation after `request approval` so the next human owner is explicitly surfaced and notified.

Why:
The founder release path stops at storing the approval request, but a release communication system eventually needs a concrete handoff from "requested" to "someone is now on the hook to review it."

Pros:
- Reduces approval lag once small teams stop manually polling the dashboard.
- Reinforces PulseNote's reviewability and accountability model.
- Gives the approval stage a clearer operational outcome than "state changed in the database."

Cons:
- Adds delivery-channel complexity such as email, Slack, or in-app notifications.
- Expands the founder-path slice beyond the core workflow state machine.
- Introduces another integration surface that is not required to validate the first wedge.

Context:
During `/plan-eng-review`, the founder-path scope was intentionally reduced to a narrow workflow: intake, draft, claim check, approval, and publish-pack export. Approval itself is in scope, but notification and assignment automation were deferred because they would widen the first implementation without changing the core truth/safety model. Revisit this once the command workflow and revision-bound approval loop are working end-to-end.

Depends on / blocked by:
- Depends on the new `releaseWorkflowService` and command endpoints being in place.
- Depends on approval being bound to a specific draft revision.
- Blocked by deciding which notification channel matters first for PulseNote's first paying customer.

- [x] Workflow History And Audit Timeline Surface

What:
Add a lazy-loaded history surface for draft revisions, review events, and publish-pack export snapshots on top of the founder workflow detail view.

Why:
The first founder-path slice is intentionally `current-summary first`, but PulseNote's long-term trust model depends on people being able to inspect what changed, who changed it, and which exact revision was approved or exported.

Pros:
- Makes the append-only event log visible and useful to humans.
- Strengthens auditability without slowing down the primary workflow view.
- Helps explain stale approvals, reopen events, and export provenance.

Cons:
- Adds UI and endpoint surface area that is not required to validate the first founder wedge.
- Increases design and interaction complexity around tabs, pagination, or lazy-loading.
- Risks pulling the first slice back toward a fuller multi-pane workflow product too early.

Context:
During `/plan-eng-review`, the workflow detail endpoint was intentionally scoped to `currentDraft`, `claimCheckSummary`, `approvalSummary`, `publishPackSummary`, and `allowedActions`. History was split out on purpose so the first slice could stay fast and operational. This TODO captures the follow-up work needed to expose the stored draft revision history and append-only review/export timeline in a way that preserves PulseNote's human-accountability promise.

Depends on / blocked by:
- Depends on draft revisions, workflow events, and publish-pack export snapshots being persisted.
- Depends on the founder workflow detail page being converted to the real read model.
- Blocked by deciding the first useful history slice: draft timeline, approval timeline, or export timeline.
