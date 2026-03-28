import assert from "node:assert/strict"
import test from "node:test"

import {
  ClaimCheckRequiredError,
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
  assert.match(detail.currentDraft?.releaseNotesBody ?? "", /founder release workflow/i)
  assert.deepEqual(detail.allowedActions, ["create_draft", "run_claim_check"])
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
    actorUserId: fixture.bootstrap.user.id,
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
  assert.deepEqual(exported.allowedActions, ["reopen_draft"])
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
    actorUserId: fixture.bootstrap.user.id,
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
    actorUserId: fixture.bootstrap.user.id,
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
