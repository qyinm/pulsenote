import assert from "node:assert/strict"
import test from "node:test"
import { ZodError } from "zod"

import { ApiError, createApiClient, getApiBaseUrl } from "../lib/api/client.js"

function createSessionPayload() {
  return {
    session: {
      createdAt: "2026-03-20T00:00:00.000Z",
      expiresAt: "2026-03-21T00:00:00.000Z",
      id: "session_1",
      updatedAt: "2026-03-20T00:00:00.000Z",
      userId: "user_1",
    },
    user: {
      createdAt: "2026-03-20T00:00:00.000Z",
      email: "owner@pulsenote.dev",
      emailVerified: true,
      id: "user_1",
      image: null,
      name: "Owner User",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

function createWorkspaceSnapshotPayload() {
  return {
    integrationAccounts: [],
    integrations: [],
    memberships: [
      {
        createdAt: "2026-03-20T00:00:00.000Z",
        id: "membership_1",
        role: "owner",
        userId: "user_1",
        workspaceId: "workspace_1",
      },
    ],
    sourceCursors: [],
    syncRuns: [],
    workspace: {
      createdAt: "2026-03-20T00:00:00.000Z",
      id: "workspace_1",
      name: "PulseNote Workspace",
      slug: "pulsenote-workspace",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

function createReleaseRecordSnapshotPayload() {
  return {
    claimCandidates: [],
    evidenceBlocks: [],
    releaseRecord: {
      compareRange: "main...feature/release-context",
      connectionId: "connection_1",
      createdAt: "2026-03-20T00:00:00.000Z",
      id: "release_1",
      stage: "intake",
      summary: "Release summary",
      title: "SDK rollout v2.4",
      updatedAt: "2026-03-20T00:00:00.000Z",
      workspaceId: "workspace_1",
    },
    reviewStatuses: [],
    sourceLinks: [],
  }
}

function createReleaseWorkflowDetailPayload() {
  return {
    allowedActions: ["run_claim_check"],
    approvalSummary: {
      draftRevisionId: "draft_1",
      note: null,
      ownerUserId: null,
      state: "not_requested",
      updatedAt: null,
    },
    claimCheckSummary: {
      blockerNotes: [],
      draftRevisionId: "draft_1",
      flaggedClaims: 0,
      items: [
        {
          createdAt: "2026-03-20T00:00:00.000Z",
          draftRevisionId: "draft_1",
          evidenceBlockIds: ["evidence_1"],
          id: "claim_check_1",
          note: null,
          releaseRecordId: "release_1",
          sentence: "Retry logic now covers the rollout cohort already enabled.",
          status: "approved",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
      ],
      state: "cleared",
      totalClaims: 1,
    },
    currentDraft: {
      changelogBody: "## SDK rollout v2.4",
      createdAt: "2026-03-20T00:00:00.000Z",
      createdByUserId: "user_1",
      id: "draft_1",
      releaseNotesBody: "SDK rollout v2.4",
      version: 1,
    },
    evidenceBlocks: createReleaseRecordSnapshotPayload().evidenceBlocks,
    latestPublishPackSummary: {
      draftRevisionId: "draft_1",
      exportId: null,
      exportedAt: null,
      state: "not_ready",
    },
    readiness: "ready",
    releaseRecord: createReleaseRecordSnapshotPayload().releaseRecord,
    reviewStatuses: createReleaseRecordSnapshotPayload().reviewStatuses,
    sourceLinks: createReleaseRecordSnapshotPayload().sourceLinks,
  }
}

function createReleaseWorkflowHistoryEntryPayload() {
  return {
    actorName: "Owner User",
    actorUserId: "user_1",
    createdAt: "2026-03-20T00:00:00.000Z",
    draftRevisionId: "draft_1",
    draftVersion: 1,
    eventLabel: "Draft approved",
    eventType: "draft_approved",
    evidenceCount: 3,
    id: "event_1",
    note: "Approved and ready for publish pack export.",
    outcome: "signed_off",
    publishPackExportId: null,
    releaseRecordId: "release_1",
    releaseTitle: "SDK rollout v2.4",
    sourceLinkCount: 2,
    stage: "approval",
  }
}

test("getApiBaseUrl prefers NEXT_PUBLIC_API_BASE_URL when configured", () => {
  assert.equal(
    getApiBaseUrl({
      NEXT_PUBLIC_API_BASE_URL: "https://api.pulsenotes.xyz",
    }),
    "https://api.pulsenotes.xyz",
  )
})

test("getApiBaseUrl reads NEXT_PUBLIC_API_BASE_URL from process.env when omitted", () => {
  const previousBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.pulsenotes.xyz"

  try {
    assert.equal(getApiBaseUrl(), "https://api.pulsenotes.xyz")
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = previousBaseUrl
    }
  }
})

test("getApiBaseUrl requires NEXT_PUBLIC_API_BASE_URL", () => {
  assert.throws(() => getApiBaseUrl({}), /NEXT_PUBLIC_API_BASE_URL is required/)
})

test("api client sends credentialed requests to session, workspace, and release record routes", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async (input, init) => {
      requests.push({ init, input })
      if (String(input).endsWith("/v1/session")) {
        return Response.json(createSessionPayload())
      }

      if (String(input).endsWith("/v1/workspaces/current")) {
        return Response.json(createWorkspaceSnapshotPayload())
      }

      if (String(input).includes("/release-records/")) {
        return Response.json(createReleaseRecordSnapshotPayload())
      }

      if (String(input).endsWith("/release-records")) {
        return Response.json([createReleaseRecordSnapshotPayload()])
      }

      return Response.json(createReleaseRecordSnapshotPayload())
    },
  })

  await client.getSession()
  await client.getCurrentWorkspace()
  await client.listReleaseRecords("workspace 1")
  await client.getReleaseRecord("workspace 1", "release/2")

  assert.deepEqual(
    requests.map((request) => String(request.input)),
    [
      "https://api.pulsenotes.xyz/v1/session",
      "https://api.pulsenotes.xyz/v1/workspaces/current",
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-records",
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-records/release%2F2",
    ],
  )

  for (const request of requests) {
    assert.equal(request.init?.credentials, "include")
    assert.equal(new Headers(request.init?.headers).has("content-type"), false)
  }
})

test("api client sends workflow read requests to founder release workflow routes", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const detailPayload = createReleaseWorkflowDetailPayload()
  const historyPayload = [createReleaseWorkflowHistoryEntryPayload()]
  const listPayload = {
    allowedActions: detailPayload.allowedActions,
    approvalSummary: detailPayload.approvalSummary,
    claimCheckSummary: {
      blockerNotes: detailPayload.claimCheckSummary.blockerNotes,
      draftRevisionId: detailPayload.claimCheckSummary.draftRevisionId,
      flaggedClaims: detailPayload.claimCheckSummary.flaggedClaims,
      state: detailPayload.claimCheckSummary.state,
      totalClaims: detailPayload.claimCheckSummary.totalClaims,
    },
    currentDraft: detailPayload.currentDraft
      ? {
          createdAt: detailPayload.currentDraft.createdAt,
          id: detailPayload.currentDraft.id,
          version: detailPayload.currentDraft.version,
        }
      : null,
    evidenceCount: detailPayload.evidenceBlocks.length,
    latestPublishPackSummary: detailPayload.latestPublishPackSummary,
    readiness: detailPayload.readiness,
    releaseRecord: detailPayload.releaseRecord,
    sourceLinkCount: detailPayload.sourceLinks.length,
  }
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async (input, init) => {
      requests.push({ init, input })

      if (String(input).includes("/history")) {
        return Response.json(historyPayload)
      }

      if (
        String(input).includes("/release-workflow/") &&
        !String(input).endsWith("/release-workflow")
      ) {
        return Response.json(detailPayload)
      }

      return Response.json([listPayload])
    },
  })

  await client.listReleaseWorkflow("workspace 1")
  await client.getReleaseWorkflowDetail("workspace 1", "release/2")
  await client.listReleaseWorkflowHistory("workspace 1")
  await client.getReleaseWorkflowHistory("workspace 1", "release/2")

  assert.deepEqual(
    requests.map((request) => String(request.input)),
    [
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-workflow",
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-workflow/release%2F2",
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-workflow/history",
      "https://api.pulsenotes.xyz/v1/workspaces/workspace%201/release-workflow/release%2F2/history",
    ],
  )

  for (const request of requests) {
    assert.equal(request.init?.credentials, "include")
    assert.equal(new Headers(request.init?.headers).has("content-type"), false)
  }
})

test("api client sends workflow command requests with encoded payloads", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async (input, init) => {
      requests.push({ init, input })
      return Response.json(createReleaseWorkflowDetailPayload(), {
        status: String(input).endsWith("/drafts") ? 201 : 200,
      })
    },
  })

  await client.createReleaseWorkflowDraft("workspace_1", "release_1", {
    expectedLatestDraftRevisionId: null,
  })
  await client.runReleaseWorkflowClaimCheck("workspace_1", "release_1", {
    expectedDraftRevisionId: "draft_1",
    note: "Check wording",
  })
  await client.requestReleaseWorkflowApproval("workspace_1", "release_1", {
    expectedDraftRevisionId: "draft_1",
  })
  await client.approveReleaseWorkflowDraft("workspace_1", "release_1", {
    expectedDraftRevisionId: "draft_1",
  })
  await client.reopenReleaseWorkflowDraft("workspace_1", "release_1", {
    expectedDraftRevisionId: "draft_1",
    note: "Tighten availability language",
  })
  await client.createReleaseWorkflowPublishPack("workspace_1", "release_1", {
    expectedDraftRevisionId: "draft_1",
  })

  assert.deepEqual(
    requests.map((request) => ({
      body: request.init?.body,
      method: request.init?.method,
      url: String(request.input),
    })),
    [
      {
        body: JSON.stringify({ expectedLatestDraftRevisionId: null }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/drafts",
      },
      {
        body: JSON.stringify({ expectedDraftRevisionId: "draft_1", note: "Check wording" }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/claim-check",
      },
      {
        body: JSON.stringify({ expectedDraftRevisionId: "draft_1" }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/request-approval",
      },
      {
        body: JSON.stringify({ expectedDraftRevisionId: "draft_1" }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/approve",
      },
      {
        body: JSON.stringify({
          expectedDraftRevisionId: "draft_1",
          note: "Tighten availability language",
        }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/reopen",
      },
      {
        body: JSON.stringify({ expectedDraftRevisionId: "draft_1" }),
        method: "POST",
        url: "https://api.pulsenotes.xyz/v1/workspaces/workspace_1/release-workflow/release_1/publish-pack",
      },
    ],
  )

  for (const request of requests) {
    assert.equal(new Headers(request.init?.headers).get("content-type"), "application/json")
    assert.equal(request.init?.credentials, "include")
  }
})

test("api client throws a structured ApiError for non-ok responses", async () => {
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async () =>
      Response.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        { status: 401 },
      ),
  })

  await assert.rejects(
    () => client.getSession(),
    (error: unknown) =>
      error instanceof ApiError &&
      error.message === "Authentication is required" &&
      error.status === 401,
  )
})

test("api client rejects unexpected response payloads", async () => {
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async () =>
      Response.json({
        user: {
          id: "user_1",
        },
      }),
  })

  await assert.rejects(
    () => client.getSession(),
    (error: unknown) =>
      error instanceof ZodError && error.issues.some((issue) => issue.path[0] === "session"),
  )
})

test("api client forwards custom headers for server-side session reads", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const client = createApiClient({
    baseUrl: "https://api.pulsenotes.xyz",
    fetch: async (input, init) => {
      requests.push({ init, input })
      return Response.json(createSessionPayload())
    },
  })

  await client.getSession({
    headers: {
      cookie: "better-auth.session=abc123",
    },
  })

  assert.equal(String(requests[0]?.input), "https://api.pulsenotes.xyz/v1/session")
  assert.equal(
    (requests[0]?.init?.headers as Record<string, string> | undefined)?.cookie,
    "better-auth.session=abc123",
  )
  assert.equal(requests[0]?.init?.credentials, "include")
})
