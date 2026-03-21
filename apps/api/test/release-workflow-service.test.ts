import assert from "node:assert/strict"
import test from "node:test"

import { createReleaseWorkflowService, ClaimCheckRequiredError, StaleDraftRevisionError } from "../src/release-workflow/service.js"
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
        workspaceId: fixture.bootstrap.workspace.id,
      }),
    ClaimCheckRequiredError,
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
  assert.equal(approved.approvalSummary.state, "approved")
  assert.equal(exported.latestPublishPackSummary.state, "exported")
  assert.equal(exported.latestPublishPackSummary.draftRevisionId, draft.currentDraft!.id)
  assert.deepEqual(exported.allowedActions, ["reopen_draft"])
})
