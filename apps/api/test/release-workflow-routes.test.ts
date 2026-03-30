import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import { seedReleaseWorkflowFixture, createAuthService, createAuthenticatedSession, runtimeEnv } from "./release-workflow-fixtures.js"

test("release workflow routes expose list and detail read models", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const listResponse = await app.request(`/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow`)

  assert.equal(listResponse.status, 200)
  const listBody = await listResponse.json()
  assert.equal(listBody.length, 1)
  assert.equal(listBody[0]?.releaseRecord.id, fixture.releaseRecord.id)
  assert.deepEqual(listBody[0]?.allowedActions, ["create_draft"])
  assert.equal(listBody[0]?.currentDraft, null)

  const detailResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}`,
  )

  assert.equal(detailResponse.status, 200)
  const detailBody = await detailResponse.json()
  assert.equal(detailBody.releaseRecord.id, fixture.releaseRecord.id)
  assert.equal(detailBody.claimCheckSummary.state, "not_started")
  assert.deepEqual(detailBody.allowedActions, ["create_draft"])
  assert.equal(detailBody.latestPublishPackArtifact, null)
})

test("release workflow draft route returns template-backed draft payloads", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
        templateId: "customer_update",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.currentDraft.templateId, "customer_update")
  assert.equal(body.currentDraft.fieldSnapshots.length, 3)
  assert.equal(body.currentDraft.evidenceRefs.length, 1)
})

test("release workflow draft route rejects unsupported templates", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
        templateId: "generic_doc",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: "Draft template generic_doc is not supported",
    status: 422,
  })
})

test("release workflow draft route saves edited draft fields as the next revision", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const createResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
        templateId: "customer_update",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(createResponse.status, 201)
  const createdDraftBody = await createResponse.json()

  const updateResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts/${createdDraftBody.currentDraft.id}`,
    {
      body: JSON.stringify({
        evidenceRefs: createdDraftBody.currentDraft.evidenceRefs,
        fieldSnapshots: createdDraftBody.currentDraft.fieldSnapshots.map((fieldSnapshot: { fieldKey: string; content: string }) =>
          fieldSnapshot.fieldKey === "customer_update"
            ? {
                ...fieldSnapshot,
                content: "Customers can now track release-ready founder notes with explicit proof.",
              }
            : fieldSnapshot,
        ),
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  )

  assert.equal(updateResponse.status, 200)
  const updatedBody = await updateResponse.json()
  assert.equal(updatedBody.currentDraft.version, 2)
  assert.match(updatedBody.currentDraft.releaseNotesBody, /customers can now track release-ready founder notes/i)
  assert.equal(
    updatedBody.currentDraft.fieldSnapshots.find((fieldSnapshot: { fieldKey: string }) => fieldSnapshot.fieldKey === "subject")?.content,
    createdDraftBody.currentDraft.fieldSnapshots.find((fieldSnapshot: { fieldKey: string }) => fieldSnapshot.fieldKey === "subject")?.content,
  )

  const historyResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/history`,
  )

  assert.equal(historyResponse.status, 200)
  const historyBody = await historyResponse.json()
  assert.equal(historyBody[0]?.eventType, "draft_updated")
})

test("release workflow routes expose workspace and release history read models", async () => {
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
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
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

  const listResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/history`,
  )

  assert.equal(listResponse.status, 200)
  const listBody = await listResponse.json()
  assert.equal(listBody.length, 2)
  assert.equal(listBody[0]?.eventType, "claim_check_completed")
  assert.equal(listBody[0]?.outcome, "progressed")
  assert.equal(listBody[0]?.actorName, "Owner User")
  assert.equal(listBody[0]?.draftVersion, 1)

  const detailResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/history`,
  )

  assert.equal(detailResponse.status, 200)
  const detailBody = await detailResponse.json()
  assert.equal(detailBody.length, 2)
  assert.equal(detailBody[1]?.eventType, "draft_created")
  assert.equal(detailBody[1]?.releaseRecordId, fixture.releaseRecord.id)
})

test("release workflow detail route exposes frozen publish pack artifact summaries", async () => {
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
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
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

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}`,
  )

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.latestPublishPackSummary.exportId, exported.latestPublishPackSummary.exportId)
  assert.equal(
    body.latestPublishPackSummary.includedEvidenceCount,
    exported.latestPublishPackArtifact?.evidenceSnapshots.length ?? 0,
  )
  assert.equal(
    body.latestPublishPackSummary.includedSourceLinkCount,
    exported.latestPublishPackArtifact?.sourceSnapshots.length ?? 0,
  )
  assert.equal(body.latestPublishPackArtifact.context.exportedByUserId, fixture.bootstrap.user.id)
  assert.equal(body.latestPublishPackArtifact.context.approvalOwnerUserId, fixture.reviewer.id)
})

test("release workflow history route returns 404 for releases outside the workspace", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/not-a-release/history`,
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    message: `Release record not-a-release was not found in workspace ${fixture.bootstrap.workspace.id}`,
    status: 404,
  })
})

test("release workflow routes return 422 when approval is requested before claim check", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow and approval checkpoints",
        releaseNotesBody: "- Adds founder release workflow and approval checkpoints",
      }
    },
  })
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  const draftBody = await draftResponse.json()
  const approvalResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
        reviewerUserId: fixture.reviewer.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(approvalResponse.status, 422)
  assert.deepEqual(await approvalResponse.json(), {
    message: "Run claim check before requesting approval",
    status: 422,
  })
})

test("release workflow routes require a reviewer when approval is requested", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: "draft_missing",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: "Select a workspace reviewer before requesting approval",
    status: 422,
  })
})

test("release workflow routes reject whitespace-only required approval ids", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const missingDraftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: "   ",
        reviewerUserId: fixture.reviewer.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(missingDraftResponse.status, 400)
  assert.deepEqual(await missingDraftResponse.json(), {
    message: "expectedDraftRevisionId is required",
    status: 400,
  })

  const missingReviewerResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: "draft_1",
        reviewerUserId: "   ",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(missingReviewerResponse.status, 422)
  assert.deepEqual(await missingReviewerResponse.json(), {
    message: "Select a workspace reviewer before requesting approval",
    status: 422,
  })
})

test("release workflow routes allow approval requests without a reviewer when workspace policy permits it", async () => {
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

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  const draftBody = await draftResponse.json()
  const approvalResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(approvalResponse.status, 200)
  const approvalBody = await approvalResponse.json()
  assert.equal(approvalBody.releaseRecord.stage, "approval")
  assert.equal(approvalBody.approvalSummary.ownerUserId, null)
})

test("release workflow routes reject reviewers outside the workspace", async () => {
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
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
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

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draft.currentDraft.id,
        reviewerUserId: "user_outside_workspace",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: `Reviewer user_outside_workspace does not belong to workspace ${fixture.bootstrap.workspace.id}`,
    status: 422,
  })
})

test("release workflow routes complete the founder happy path", async () => {
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
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })
  const reviewerApp = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.reviewer.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  assert.equal(draftResponse.status, 201)
  const draftBody = await draftResponse.json()

  const claimCheckResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/claim-check`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  assert.equal(claimCheckResponse.status, 200)
  const claimCheckBody = await claimCheckResponse.json()
  assert.equal(claimCheckBody.claimCheckSummary.state, "cleared")

  const requestApprovalResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
        reviewerUserId: fixture.reviewer.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  assert.equal(requestApprovalResponse.status, 200)
  const requestApprovalBody = await requestApprovalResponse.json()
  assert.equal(requestApprovalBody.approvalSummary.ownerUserId, fixture.reviewer.id)
  assert.equal(requestApprovalBody.approvalSummary.requestedByUserId, fixture.bootstrap.user.id)

  const approveResponse = await reviewerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/approve`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  assert.equal(approveResponse.status, 200)
  const approveBody = await approveResponse.json()
  assert.equal(approveBody.approvalSummary.state, "approved")

  const publishPackResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/publish-pack`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draftBody.currentDraft.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )
  assert.equal(publishPackResponse.status, 200)
  const publishPackBody = await publishPackResponse.json()

  assert.equal(publishPackBody.releaseRecord.stage, "publish_pack")
  assert.equal(publishPackBody.latestPublishPackSummary.state, "exported")
  assert.deepEqual(publishPackBody.allowedActions, ["reopen_draft"])
})

test("release workflow routes reject approval from a workspace member who is not assigned", async () => {
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
  const ownerApp = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
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

  const response = await ownerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/approve`,
    {
      body: JSON.stringify({
        expectedDraftRevisionId: draft.currentDraft!.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Only the assigned reviewer can approve this draft",
    status: 403,
  })
})

test("release workflow routes reject malformed JSON when creating drafts", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: "{",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "Malformed JSON request body",
    status: 400,
  })
})

test("release workflow routes reject malformed JSON for draft commands before validation", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(fixture.bootstrap.user.id)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-approval`,
    {
      body: "{",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "Malformed JSON request body",
    status: 400,
  })
})
