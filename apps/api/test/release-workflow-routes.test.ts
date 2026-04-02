import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import {
  createAuthService,
  createAuthenticatedSession,
  runtimeEnv,
  seedReleaseWorkflowFixture,
} from "./release-workflow-fixtures.js"

function createWorkflowApp(fixture: Awaited<ReturnType<typeof seedReleaseWorkflowFixture>>, userId: string) {
  return createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(userId)),
    foundationService: fixture.foundationService,
    releaseWorkflowService: fixture.workflowService,
  })
}

test("release workflow routes expose list and detail read models", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const listResponse = await app.request(`/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow`)
  assert.equal(listResponse.status, 200)
  const listBody = await listResponse.json()
  assert.equal(listBody.length, 1)
  assert.equal(listBody[0]?.releaseRecord.id, fixture.releaseRecord.id)
  assert.deepEqual(listBody[0]?.allowedActions, ["create_draft"])
  assert.equal(listBody[0]?.currentDraft, null)
  assert.equal(listBody[0]?.reviewSummary.state, "not_requested")

  const detailResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}`,
  )
  assert.equal(detailResponse.status, 200)
  const detailBody = await detailResponse.json()
  assert.equal(detailBody.releaseRecord.id, fixture.releaseRecord.id)
  assert.equal(detailBody.reviewSummary.state, "not_requested")
  assert.deepEqual(detailBody.allowedActions, ["create_draft"])
  assert.equal(detailBody.latestPublishPackArtifact, null)
})

test("release workflow draft routes create and update template-backed drafts", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const createResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({
        expectedLatestDraftRevisionId: null,
        templateId: "customer_update",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(createResponse.status, 201)
  const createdDraftBody = await createResponse.json()
  assert.equal(createdDraftBody.currentDraft.templateId, "customer_update")
  assert.equal(createdDraftBody.currentDraft.fieldSnapshots.length, 1)
  assert.equal(createdDraftBody.currentDraft.evidenceRefs.length, 1)

  const updateResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts/${createdDraftBody.currentDraft.id}`,
    {
      body: JSON.stringify({
        evidenceRefs: createdDraftBody.currentDraft.evidenceRefs,
        fieldSnapshots: createdDraftBody.currentDraft.fieldSnapshots.map((fieldSnapshot: { fieldKey: string; content: string }) =>
          fieldSnapshot.fieldKey === "customer_update"
            ? {
                ...fieldSnapshot,
                content: "Customers can now track release-ready notes with explicit proof.",
              }
            : fieldSnapshot,
        ),
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  )

  assert.equal(updateResponse.status, 200)
  const updatedBody = await updateResponse.json()
  assert.equal(updatedBody.currentDraft.version, 2)
  assert.match(updatedBody.currentDraft.releaseNotesBody, /release-ready notes/i)

  const historyResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/history`,
  )
  assert.equal(historyResponse.status, 200)
  const historyBody = await historyResponse.json()
  assert.equal(historyBody[0]?.eventType, "draft_updated")
})

test("release workflow routes expose workspace and release history read models for the review workflow", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

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

  const listResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/history`,
  )
  assert.equal(listResponse.status, 200)
  const listBody = await listResponse.json()
  assert.equal(listBody.length, 2)
  assert.equal(listBody[0]?.eventType, "review_requested")
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
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

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

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}`,
  )
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.latestPublishPackSummary.exportId, exported.latestPublishPackSummary.exportId)
  assert.equal(body.latestPublishPackArtifact.context.exportedByUserId, fixture.bootstrap.user.id)
  assert.equal(body.latestPublishPackArtifact.context.approvalOwnerUserId, fixture.reviewer.id)
})

test("request-review route requires a reviewer when workspace policy requires assignment", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({ expectedLatestDraftRevisionId: null }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  const draftBody = await draftResponse.json()

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-review`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: "Select a workspace reviewer before requesting review",
    status: 422,
  })
})

test("request-review route allows unassigned review when workspace policy permits it", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  await fixture.foundationStore.updateWorkspacePolicySettings({
    requireReviewerAssignment: false,
    workspaceId: fixture.bootstrap.workspace.id,
  })
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({ expectedLatestDraftRevisionId: null }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  const draftBody = await draftResponse.json()

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-review`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id, note: "queue it" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.reviewSummary.state, "pending")
  assert.equal(body.reviewSummary.ownerUserId, null)
  assert.equal(body.reviewSummary.requestedByUserId, fixture.bootstrap.user.id)
})

test("request-review route rejects reviewers outside the workspace", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const draftResponse = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({ expectedLatestDraftRevisionId: null }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  const draftBody = await draftResponse.json()

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-review`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id, reviewerUserId: "user_outside_workspace" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    message: `Reviewer user_outside_workspace does not belong to workspace ${fixture.bootstrap.workspace.id}`,
    status: 422,
  })
})

test("release workflow routes complete the review happy path", async () => {
  const fixture = await seedReleaseWorkflowFixture({
    async composeDraft() {
      return {
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const ownerApp = createWorkflowApp(fixture, fixture.bootstrap.user.id)
  const reviewerApp = createWorkflowApp(fixture, fixture.reviewer.id)

  const draftResponse = await ownerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/drafts`,
    {
      body: JSON.stringify({ expectedLatestDraftRevisionId: null }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  assert.equal(draftResponse.status, 201)
  const draftBody = await draftResponse.json()

  const requestReviewResponse = await ownerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-review`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id, reviewerUserId: fixture.reviewer.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  assert.equal(requestReviewResponse.status, 200)
  const requestReviewBody = await requestReviewResponse.json()
  assert.equal(requestReviewBody.reviewSummary.ownerUserId, fixture.reviewer.id)
  assert.equal(requestReviewBody.reviewSummary.requestedByUserId, fixture.bootstrap.user.id)

  const approveResponse = await reviewerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/approve`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  assert.equal(approveResponse.status, 200)
  const approveBody = await approveResponse.json()
  assert.equal(approveBody.reviewSummary.state, "approved")

  const publishPackResponse = await ownerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/publish-pack`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draftBody.currentDraft.id }),
      headers: { "content-type": "application/json" },
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
        changelogBody: "- Adds founder release workflow checkpoints",
        releaseNotesBody: "- Adds founder release workflow checkpoints",
      }
    },
  })
  const ownerApp = createWorkflowApp(fixture, fixture.bootstrap.user.id)

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

  const response = await ownerApp.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/approve`,
    {
      body: JSON.stringify({ expectedDraftRevisionId: draft.currentDraft!.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Only the assigned reviewer can approve this draft",
    status: 403,
  })
})

test("release workflow routes reject malformed JSON for review commands before validation", async () => {
  const fixture = await seedReleaseWorkflowFixture()
  const app = createWorkflowApp(fixture, fixture.bootstrap.user.id)

  const response = await app.request(
    `/v1/workspaces/${fixture.bootstrap.workspace.id}/release-workflow/${fixture.releaseRecord.id}/request-review`,
    {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "Malformed JSON request body",
    status: 400,
  })
})
