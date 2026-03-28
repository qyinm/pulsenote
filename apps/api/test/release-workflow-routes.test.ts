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

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "reviewerUserId is required",
    status: 400,
  })
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
