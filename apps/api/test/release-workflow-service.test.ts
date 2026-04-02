import assert from "node:assert/strict"
import test from "node:test"

import {
  ApprovedDraftRequiredError,
  InvalidStageTransitionError,
  InvalidDraftTemplateError,
  ReviewRequestRequiredError,
  ReviewerApprovalRequiredError,
  ReviewerAssignmentNotAllowedError,
  ReviewerAssignmentRequiredError,
  StaleDraftRevisionError,
} from "../src/release-workflow/service.js"
import { seedReleaseWorkflowFixture } from "./release-workflow-fixtures.js"

function createComposeDraftBodies() {
  return {
    changelogBody: "## Founder workflow\n\n- Adds founder release workflow checkpoints",
    releaseNotesBody: "Founder workflow\n\n- Adds founder release workflow checkpoints",
  }
}

test("release workflow service creates a draft revision and advances the release to draft", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const detail = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.releaseRecord.stage, "draft")
  assert.equal(detail.currentDraft?.version, 1)
  assert.equal(detail.currentDraft?.templateId, "release_note_packet")
  assert.equal(detail.currentDraft?.templateLabel, "Release notes packet")
  assert.deepEqual(detail.currentDraft?.fieldSnapshots.map((fieldSnapshot) => fieldSnapshot.fieldKey), [
    "publish_pack",
  ])
  assert.equal(detail.currentDraft?.evidenceRefs.length, 1)
  assert.match(detail.currentDraft?.releaseNotesBody ?? "", /founder release workflow/i)
  assert.deepEqual(detail.allowedActions, ["create_draft", "request_review"])
  assert.equal(detail.reviewSummary.state, "not_requested")
})

test("release workflow service creates template-backed drafts for customer updates", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const detail = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    templateId: "customer_update",
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.currentDraft?.templateId, "customer_update")
  assert.deepEqual(detail.currentDraft?.fieldSnapshots.map((fieldSnapshot) => fieldSnapshot.fieldKey), [
    "customer_update",
  ])
})

test("release workflow service rejects unsupported draft templates", async () => {
  const fixture = await seedReleaseWorkflowFixture()

  await assert.rejects(
    () =>
      fixture.workflowService.createDraft({
        actorUserId: fixture.bootstrap.user.id,
        expectedLatestDraftRevisionId: null,
        releaseRecordId: fixture.releaseRecord.id,
        templateId: "not_a_release_template",
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    InvalidDraftTemplateError,
  )
})

test("release workflow service rejects stale draft revisions for draft creation", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.createDraft({
        actorUserId: fixture.bootstrap.user.id,
        expectedLatestDraftRevisionId: null,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    StaleDraftRevisionError,
  )
})

test("release workflow service saves edited template fields as the next draft revision", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const firstDraft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    templateId: "customer_update",
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.updateDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: firstDraft.currentDraft!.id,
    fieldSnapshots: firstDraft.currentDraft!.fieldSnapshots.map((fieldSnapshot) =>
      fieldSnapshot.fieldKey === "customer_update"
        ? {
            ...fieldSnapshot,
            content: "Customers can now review founder release workflow revisions with explicit proof.",
            plainText: "Customers can now review founder release workflow revisions with explicit proof.",
          }
        : fieldSnapshot,
    ),
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.currentDraft?.version, 2)
  assert.equal(detail.currentDraft?.templateId, "customer_update")
  assert.match(detail.currentDraft?.releaseNotesBody ?? "", /customers can now review founder release workflow revisions/i)
})

test("release workflow service preserves server-owned evidence refs on draft updates", async () => {
  const fixture = await seedReleaseWorkflowFixture()

  const firstDraft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    templateId: "customer_update",
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.updateDraft({
    actorUserId: fixture.bootstrap.user.id,
    evidenceRefs: [
      {
        anchorText: "forged",
        createdAt: "2026-03-30T00:00:00.000Z",
        evidenceBlockId: "forged_evidence_block",
        fieldKey: "customer_update",
        id: "forged_ref",
        note: "forged",
        sourceLinkId: "forged_source_link",
      },
    ],
    expectedDraftRevisionId: firstDraft.currentDraft!.id,
    fieldSnapshots: [
      {
        ...firstDraft.currentDraft!.fieldSnapshots.find((fieldSnapshot) => fieldSnapshot.fieldKey === "customer_update")!,
        content: "Customers can now review release drafts with preserved proof links.",
        plainText: "Customers can now review release drafts with preserved proof links.",
      },
    ],
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.deepEqual(detail.currentDraft?.evidenceRefs, firstDraft.currentDraft?.evidenceRefs)
})

test("requestReview requires assigning a reviewer when workspace policy requires it", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.requestReview({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ReviewerAssignmentRequiredError,
  )
})

test("requestReview allows unassigned review when workspace policy permits it", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  await fixture.foundationStore.updateWorkspacePolicySettings({
    requireReviewerAssignment: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "Queue this for review",
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.releaseRecord.stage, "review")
  assert.equal(detail.reviewSummary.state, "pending")
  assert.equal(detail.reviewSummary.ownerUserId, null)
  assert.equal(detail.reviewSummary.requestedByUserId, fixture.bootstrap.user.id)
  assert.deepEqual(detail.allowedActions, ["reopen_draft", "approve_draft"])
})

test("requestReview rejects reviewers outside the workspace", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.requestReview({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        reviewerUserId: "user_outside_workspace",
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ReviewerAssignmentNotAllowedError,
  )
})

test("approveDraft requires a pending review request and only allows the assigned reviewer", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.approveDraft({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    InvalidStageTransitionError,
  )

  await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.approveDraft({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ReviewerApprovalRequiredError,
  )

  const approved = await fixture.workflowService.approveDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "approved",
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(approved.reviewSummary.state, "approved")
  assert.equal(approved.latestPublishPackSummary.state, "ready")
  assert.equal(approved.releaseRecord.stage, "publish_pack")
})

test("createPublishPack requires an approved draft", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.createPublishPack({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    InvalidStageTransitionError,
  )
})

test("release workflow service supports the review happy path end to end", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const reviewRequested = await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "please review",
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const approved = await fixture.workflowService.approveDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "approved",
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const exported = await fixture.workflowService.createPublishPack({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(reviewRequested.releaseRecord.stage, "review")
  assert.equal(reviewRequested.reviewSummary.ownerUserId, fixture.reviewer.id)
  assert.equal(reviewRequested.reviewSummary.ownerName, fixture.reviewer.fullName)
  assert.equal(reviewRequested.reviewSummary.requestedByUserId, fixture.bootstrap.user.id)
  assert.equal(reviewRequested.reviewSummary.requestedByName, fixture.bootstrap.user.fullName)
  assert.equal(approved.reviewSummary.state, "approved")
  assert.equal(exported.latestPublishPackSummary.state, "exported")
  assert.equal(exported.latestPublishPackSummary.draftRevisionId, draft.currentDraft!.id)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalOwnerUserId, fixture.reviewer.id)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalOwnerName, fixture.reviewer.fullName)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalRequestedByUserId, fixture.bootstrap.user.id)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalRequestedByName, fixture.bootstrap.user.fullName)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalState, "approved")
  assert.equal(exported.latestPublishPackArtifact?.context.exportedByUserId, fixture.bootstrap.user.id)
  assert.deepEqual(exported.allowedActions, ["reopen_draft"])
})

test("release workflow service respects export policy when freezing a publish pack artifact", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  await fixture.foundationStore.updateWorkspacePolicySettings({
    includeEvidenceLinksInExport: false,
    includeSourceLinksInExport: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.approveDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const exported = await fixture.workflowService.createPublishPack({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(exported.latestPublishPackSummary.includesEvidenceLinks, false)
  assert.equal(exported.latestPublishPackSummary.includesSourceLinks, false)
  assert.equal(exported.latestPublishPackSummary.includedEvidenceCount, 0)
  assert.equal(exported.latestPublishPackSummary.includedSourceLinkCount, 0)
  assert.equal(exported.latestPublishPackArtifact?.policy.includeEvidenceLinksInExport, false)
  assert.equal(exported.latestPublishPackArtifact?.policy.includeSourceLinksInExport, false)
  assert.deepEqual(exported.latestPublishPackArtifact?.evidenceSnapshots, [])
  assert.deepEqual(exported.latestPublishPackArtifact?.sourceSnapshots, [])
})

test("reopenDraft returns the workflow to draft and records reopened review state", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "needs pass",
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const reopened = await fixture.workflowService.reopenDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    note: "needs edits",
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(reopened.releaseRecord.stage, "draft")
  assert.equal(reopened.reviewSummary.state, "reopened")
  assert.equal(reopened.reviewSummary.note, "needs edits")
  assert.deepEqual(reopened.allowedActions, ["create_draft", "request_review"])
})

test("release workflow service exposes release history entries with actor, draft version, and export context", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return createComposeDraftBodies()
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestReview({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.approveDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const exported = await fixture.workflowService.createPublishPack({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const history = await fixture.workflowService.listReleaseWorkflowHistory(fixture.bootstrap.workspace.id)

  assert.deepEqual(
    history.map((entry) => entry.eventType),
    ["publish_pack_created", "draft_approved", "review_requested", "draft_created"],
  )
  assert.equal(history[0]?.publishPackExportId, exported.latestPublishPackSummary.exportId)
  assert.equal(history[0]?.outcome, "signed_off")
  assert.equal(history[1]?.outcome, "signed_off")
  assert.equal(history[2]?.outcome, "progressed")
  assert.equal(history[3]?.outcome, "revision")
  assert.equal(history[0]?.actorName, "Owner User")
  assert.equal(history[1]?.actorName, "Reviewer User")
  assert.equal(history[0]?.draftVersion, 1)
})
