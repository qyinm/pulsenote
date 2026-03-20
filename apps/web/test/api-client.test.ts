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

test("getApiBaseUrl prefers NEXT_PUBLIC_API_BASE_URL when configured", () => {
  assert.equal(
    getApiBaseUrl({
      NEXT_PUBLIC_API_BASE_URL: "https://api.pulsenotes.xyz",
    }),
    "https://api.pulsenotes.xyz",
  )
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
