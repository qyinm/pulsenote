import assert from "node:assert/strict"
import test from "node:test"

import {
  ClaimCheckRequiredError,
  InvalidDraftTemplateError,
  ReviewerApprovalRequiredError,
  ReviewerAssignmentNotAllowedError,
  ReviewerAssignmentRequiredError,
  StaleDraftRevisionError,
  createReleaseWorkflowService,
} from "../src/release-workflow/service.js"
import { seedReleaseWorkflowFixture } from "./release-workflow-fixtures.js"

test("release workflow service creates a draft revision and advances the release to draft", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "## Founder workflow\n\n- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "Founder workflow\n\n- Adds founder release workflow and approval checkpoints",
      }
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
  assert.equal(detail.currentDraft?.fieldSnapshots.length, 2)
  assert.equal(detail.currentDraft?.evidenceRefs.length, 1)
  assert.match(detail.currentDraft?.releaseNotesBody ?? "", /founder release workflow/i)
  assert.deepEqual(detail.allowedActions, ["create_draft", "run_claim_check"])
})

test("release workflow service creates template-backed drafts for customer updates", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "## Founder workflow\n\n- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "Founder workflow\n\n- Adds founder release workflow and approval checkpoints",
      }
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
  assert.equal(detail.currentDraft?.fieldSnapshots.length, 3)
  assert.deepEqual(
    detail.currentDraft?.fieldSnapshots.map((fieldSnapshot) => fieldSnapshot.fieldKey),
    ["subject", "summary", "customer_update"],
  )
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
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
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

test("release workflow service requires claim check before approval can be requested", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
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
      fixture.workflowService.requestApproval({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        reviewerUserId: fixture.reviewer.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ClaimCheckRequiredError,
  )
})

test("release workflow service allows approval requests before claim check when workspace policy makes it optional", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
  })

  await fixture.foundationStore.updateWorkspacePolicySettings({
    requireClaimCheckBeforeApproval: false,
    requireReviewerAssignment: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.requestApproval({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.releaseRecord.stage, "approval")
  assert.equal(detail.approvalSummary.state, "pending")
  assert.equal(detail.approvalSummary.ownerUserId, null)
})

test("release workflow service requires assigning a reviewer before approval is requested", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.requestApproval({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        reviewerUserId: "",
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ReviewerAssignmentRequiredError,
  )
})

test("release workflow detail exposes request approval from draft when claim check is optional", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
  })

  await fixture.foundationStore.updateWorkspacePolicySettings({
    requireClaimCheckBeforeApproval: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.ok(detail.allowedActions.includes("request_approval"))
})

test("release workflow detail keeps request approval unavailable when optional claim check is still blocked", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck() {
      return [
        {
          evidenceBlockIds: [],
          note: "This sentence sounds customer-facing but could not be traced to release evidence.",
          sentence: "Adds founder release workflow and approval checkpoints",
          status: "flagged" as const,
        },
      ]
    },
  })

  await fixture.foundationStore.updateWorkspacePolicySettings({
    requireClaimCheckBeforeApproval: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.reopenDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await fixture.workflowService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(detail.releaseRecord.stage, "draft")
  assert.equal(detail.claimCheckSummary.state, "blocked")
  assert.equal(detail.allowedActions.includes("request_approval"), false)
})

test("release workflow service rejects reviewers outside the workspace", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await assert.rejects(
    () =>
      fixture.workflowService.requestApproval({
        actorUserId: fixture.bootstrap.user.id,
        expectedDraftRevisionId: draft.currentDraft!.id,
        releaseRecordId: fixture.releaseRecord.id,
        reviewerUserId: "user_outside_workspace",
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ReviewerAssignmentNotAllowedError,
  )
})

test("release workflow service rolls back partial draft writes when the workflow event fails", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
  })
  const failingStore = {
    ...fixture.workflowStore,
    async transaction<T>(callback: (store: typeof fixture.workflowStore) => Promise<T>) {
      return fixture.workflowStore.transaction((transactionStore) =>
        callback({
          ...transactionStore,
          async createWorkflowEvent() {
            throw new Error("workflow event write failed")
          },
        }),
      )
    },
  }
  const failingService = createReleaseWorkflowService(failingStore)

  await assert.rejects(
    () =>
      failingService.createDraft({
        actorUserId: fixture.bootstrap.user.id,
        expectedLatestDraftRevisionId: null,
        releaseRecordId: fixture.releaseRecord.id,
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    /workflow event write failed/,
  )

  const detail = await fixture.workflowService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(detail.releaseRecord.stage, "intake")
  assert.equal(detail.currentDraft, null)
})

test("release workflow service supports the founder happy path end to end", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const claimChecked = await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const approvalRequested = await fixture.workflowService.requestApproval({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const approved = await fixture.workflowService.approveDraft({
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

  assert.equal(claimChecked.claimCheckSummary.state, "cleared")
  assert.equal(approvalRequested.releaseRecord.stage, "approval")
  assert.equal(approvalRequested.approvalSummary.ownerUserId, fixture.reviewer.id)
  assert.equal(approvalRequested.approvalSummary.ownerName, fixture.reviewer.fullName)
  assert.equal(approvalRequested.approvalSummary.requestedByUserId, fixture.bootstrap.user.id)
  assert.equal(approvalRequested.approvalSummary.requestedByName, fixture.bootstrap.user.fullName)
  assert.equal(approved.approvalSummary.state, "approved")
  assert.equal(exported.latestPublishPackSummary.state, "exported")
  assert.equal(exported.latestPublishPackSummary.draftRevisionId, draft.currentDraft!.id)
  assert.equal(exported.latestPublishPackSummary.exportedByUserId, fixture.bootstrap.user.id)
  assert.equal(exported.latestPublishPackSummary.exportedByName, fixture.bootstrap.user.fullName)
  assert.equal(exported.latestPublishPackSummary.includesEvidenceLinks, true)
  assert.equal(exported.latestPublishPackSummary.includesSourceLinks, true)
  assert.equal(exported.latestPublishPackSummary.includedEvidenceCount, exported.evidenceBlocks.length)
  assert.equal(exported.latestPublishPackSummary.includedSourceLinkCount, exported.sourceLinks.length)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalOwnerUserId, fixture.reviewer.id)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalOwnerName, fixture.reviewer.fullName)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalRequestedByUserId, fixture.bootstrap.user.id)
  assert.equal(exported.latestPublishPackArtifact?.context.approvalRequestedByName, fixture.bootstrap.user.fullName)
  assert.equal(exported.latestPublishPackArtifact?.context.exportedByUserId, fixture.bootstrap.user.id)
  assert.equal(exported.latestPublishPackArtifact?.policy.includeEvidenceLinksInExport, true)
  assert.equal(exported.latestPublishPackArtifact?.policy.includeSourceLinksInExport, true)
  assert.equal(exported.latestPublishPackArtifact?.evidenceSnapshots.length, exported.evidenceBlocks.length)
  assert.equal(exported.latestPublishPackArtifact?.sourceSnapshots.length, exported.sourceLinks.length)
  assert.deepEqual(exported.allowedActions, ["reopen_draft"])
})

test("release workflow service respects export policy when freezing a publish pack artifact", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
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

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestApproval({
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

test("release workflow service keeps publish pack artifacts frozen after release evidence changes", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestApproval({
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

  const frozenEvidenceCount = exported.latestPublishPackArtifact?.evidenceSnapshots.length ?? 0
  const frozenSourceCount = exported.latestPublishPackArtifact?.sourceSnapshots.length ?? 0

  await fixture.foundationStore.createEvidenceBlock({
    body: "A later support note should not rewrite the frozen publish pack artifact.",
    evidenceState: "fresh",
    provider: "github",
    releaseRecordId: fixture.releaseRecord.id,
    sourceRef: "support-note-2",
    sourceType: "document",
    title: "Support note follow-up",
  })
  await fixture.foundationStore.createSourceLink({
    label: "Later support note",
    provider: "github",
    releaseRecordId: fixture.releaseRecord.id,
    url: "https://example.com/support-note-follow-up",
  })

  const detail = await fixture.workflowService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(detail.evidenceBlocks.length, frozenEvidenceCount + 1)
  assert.equal(detail.sourceLinks.length, frozenSourceCount + 1)
  assert.equal(detail.latestPublishPackArtifact?.evidenceSnapshots.length, frozenEvidenceCount)
  assert.equal(detail.latestPublishPackArtifact?.sourceSnapshots.length, frozenSourceCount)
  assert.equal(detail.latestPublishPackSummary.includedEvidenceCount, frozenEvidenceCount)
  assert.equal(detail.latestPublishPackSummary.includedSourceLinkCount, frozenSourceCount)
})

test("release workflow service treats approved events as newer than approval requests when timestamps tie", async () => {
  const fixedCreatedAt = "2026-03-21T00:00:00.000Z"
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })
  const tiedTimestampStore = {
    ...fixture.workflowStore,
    async transaction<T>(callback: (store: typeof fixture.workflowStore) => Promise<T>) {
      return fixture.workflowStore.transaction((transactionStore) =>
        callback({
          ...transactionStore,
          async createWorkflowEvent(input) {
            const workflowEvent = await transactionStore.createWorkflowEvent(input)
            workflowEvent.createdAt = fixedCreatedAt
            return workflowEvent
          },
        }),
      )
    },
  }
  const tiedTimestampService = createReleaseWorkflowService(tiedTimestampStore, {
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await tiedTimestampService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.requestApproval({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.approveDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await tiedTimestampService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )
  const exported = await tiedTimestampService.createPublishPack({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(detail.approvalSummary.state, "approved")
  assert.equal(exported.latestPublishPackSummary.state, "exported")
})

test("release workflow service keeps the latest requester when approval requests share a timestamp", async () => {
  const fixedCreatedAt = "2026-03-21T00:00:00.000Z"
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })
  const requester = await fixture.foundationStore.createUser({
    email: "requester-2@pulsenote.dev",
    fullName: "Requester Two",
  })
  await fixture.foundationStore.createWorkspaceMembership({
    role: "member",
    userId: requester.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const tiedTimestampStore = {
    ...fixture.workflowStore,
    async transaction<T>(callback: (store: typeof fixture.workflowStore) => Promise<T>) {
      return fixture.workflowStore.transaction((transactionStore) =>
        callback({
          ...transactionStore,
          async createWorkflowEvent(input) {
            const workflowEvent = await transactionStore.createWorkflowEvent(input)
            if (workflowEvent.type === "approval_requested") {
              workflowEvent.createdAt = fixedCreatedAt
            }
            return workflowEvent
          },
        }),
      )
    },
  }
  const tiedTimestampService = createReleaseWorkflowService(tiedTimestampStore, {
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await tiedTimestampService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.requestApproval({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.reopenDraft({
    actorUserId: fixture.reviewer.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.runClaimCheck({
    actorUserId: requester.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await tiedTimestampService.requestApproval({
    actorUserId: requester.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    reviewerUserId: fixture.reviewer.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const detail = await tiedTimestampService.getReleaseWorkflowDetail(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(detail.approvalSummary.requestedByUserId, requester.id)
  assert.equal(detail.approvalSummary.requestedByName, "Requester Two")
})

test("release workflow service only allows the assigned reviewer to approve a pending draft", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestApproval({
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
})

test("release workflow service exposes release history entries with actor, draft version, and export context", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.requestApproval({
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

  const history = await fixture.workflowService.listReleaseWorkflowHistory(
    fixture.bootstrap.workspace.id,
  )

  assert.deepEqual(
    history.map((entry) => entry.eventType),
    [
      "publish_pack_created",
      "draft_approved",
      "approval_requested",
      "claim_check_completed",
      "draft_created",
    ],
  )
  assert.equal(history[0]?.publishPackExportId, exported.latestPublishPackSummary.exportId)
  assert.equal(history[0]?.outcome, "signed_off")
  assert.equal(history[1]?.outcome, "signed_off")
  assert.equal(history[2]?.outcome, "progressed")
  assert.equal(history[3]?.outcome, "progressed")
  assert.equal(history[4]?.outcome, "revision")
  assert.equal(history[0]?.actorName, "Owner User")
  assert.equal(history[0]?.draftVersion, 1)
  assert.equal(history[0]?.releaseTitle, fixture.releaseRecord.title)
  assert.equal(history[0]?.evidenceCount, 1)
  assert.equal(history[0]?.sourceLinkCount, 1)

  const releaseHistory = await fixture.workflowService.getReleaseWorkflowHistory(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(releaseHistory.length, history.length)
  assert.deepEqual(
    releaseHistory.map((entry) => entry.id),
    history.map((entry) => entry.id),
  )
})

test("release workflow service marks blocked claim check history when flagged claims remain", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(draftSnapshot, draftRevision) {
      void draftSnapshot
      return [
        {
          evidenceBlockIds: [],
          note: "This sentence sounds customer-facing but could not be traced to release evidence.",
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "flagged" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const history = await fixture.workflowService.getReleaseWorkflowHistory(
    fixture.bootstrap.workspace.id,
    fixture.releaseRecord.id,
  )

  assert.equal(history[0]?.eventType, "claim_check_completed")
  assert.equal(history[0]?.outcome, "blocked")
  assert.equal(history[0]?.draftVersion, 1)
})

test("release workflow service replaces old claim check results when a reopened draft is checked again", async () => {
  let runCount = 0
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
    async runClaimCheck(releaseSnapshot, draftRevision) {
      runCount += 1

      if (runCount === 1) {
        return [
          {
            evidenceBlockIds: [],
            note: "This sentence sounds customer-facing but could not be traced to release evidence.",
            sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
            status: "flagged" as const,
          },
        ]
      }

      return [
        {
          evidenceBlockIds: releaseSnapshot.claimCandidates[0]?.evidenceBlockIds ?? [],
          note: null,
          sentence: draftRevision.releaseNotesBody.replace(/^- /, ""),
          status: "approved" as const,
        },
      ]
    },
  })

  const draft = await fixture.workflowService.createDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedLatestDraftRevisionId: null,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const firstClaimCheck = await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(firstClaimCheck.claimCheckSummary.state, "blocked")
  assert.equal(firstClaimCheck.claimCheckSummary.flaggedClaims, 1)
  assert.equal(firstClaimCheck.claimCheckSummary.totalClaims, 1)

  await fixture.workflowService.reopenDraft({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  const rerunClaimCheck = await fixture.workflowService.runClaimCheck({
    actorUserId: fixture.bootstrap.user.id,
    expectedDraftRevisionId: draft.currentDraft!.id,
    releaseRecordId: fixture.releaseRecord.id,
    workspaceId: fixture.bootstrap.workspace.id,
  })

  assert.equal(rerunClaimCheck.claimCheckSummary.state, "cleared")
  assert.equal(rerunClaimCheck.claimCheckSummary.flaggedClaims, 0)
  assert.equal(rerunClaimCheck.claimCheckSummary.totalClaims, 1)
  assert.deepEqual(rerunClaimCheck.claimCheckSummary.blockerNotes, [])
})
