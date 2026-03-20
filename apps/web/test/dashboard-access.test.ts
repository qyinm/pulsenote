import assert from "node:assert/strict"
import test from "node:test"

import { ApiError, type ApiSession, type WorkspaceSnapshot } from "../lib/api/client.js"
import {
  getServerCurrentWorkspace,
  resolveDashboardAccessState,
} from "../lib/dashboard/access.js"

function createSession(userId: string): ApiSession {
  return {
    session: {
      createdAt: "2026-03-20T00:00:00.000Z",
      expiresAt: "2026-03-21T00:00:00.000Z",
      id: `session_${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
      userId,
    },
    user: {
      createdAt: "2026-03-20T00:00:00.000Z",
      email: `${userId}@pulsenote.dev`,
      emailVerified: true,
      id: userId,
      name: `User ${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

function createWorkspaceSnapshot(workspaceName = "Current workspace"): WorkspaceSnapshot {
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
      name: workspaceName,
      slug: "current-workspace",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

test("getServerCurrentWorkspace forwards the incoming cookie header", async () => {
  let receivedInit: RequestInit | undefined

  const workspace = await getServerCurrentWorkspace(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    {
      async getCurrentWorkspace(init) {
        receivedInit = init
        return createWorkspaceSnapshot()
      },
    },
  )

  assert.equal(
    ((receivedInit?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.notEqual(workspace, null)
  assert.notEqual(workspace, "selection-required")

  if (!workspace || workspace === "selection-required") {
    assert.fail("Expected a concrete workspace snapshot")
  }

  assert.equal(workspace.workspace.name, "Current workspace")
})

test("getServerCurrentWorkspace degrades missing-workspace responses to null", async () => {
  const workspace = await getServerCurrentWorkspace(new Headers(), {
    async getCurrentWorkspace() {
      throw new ApiError("Current workspace was not found", 404, {
        message: "Current workspace was not found",
        status: 404,
      })
    },
  })

  assert.equal(workspace, null)
})

test("getServerCurrentWorkspace marks ambiguous workspace membership as selection-required", async () => {
  const workspace = await getServerCurrentWorkspace(new Headers(), {
    async getCurrentWorkspace() {
      throw new ApiError(
        "Multiple workspaces found; specify the current workspace before loading the dashboard",
        409,
        {
          message: "Multiple workspaces found; specify the current workspace before loading the dashboard",
          status: 409,
        },
      )
    },
  })

  assert.equal(workspace, "selection-required")
})

test("resolveDashboardAccessState returns a signed-out state when no session is present", async () => {
  const accessState = await resolveDashboardAccessState(new Headers(), {
    getCurrentWorkspace: async () => {
      throw new Error("workspace lookup should not run without a session")
    },
    getSession: async () => null,
  })

  assert.deepEqual(accessState, { kind: "signed-out" })
})

test("resolveDashboardAccessState returns a no-workspace state for signed-in users without membership", async () => {
  const session = createSession("user_1")
  const accessState = await resolveDashboardAccessState(new Headers(), {
    getCurrentWorkspace: async () => null,
    getSession: async () => session,
  })

  assert.deepEqual(accessState, {
    kind: "no-workspace",
    session,
  })
})

test("resolveDashboardAccessState returns the current workspace for authorized members", async () => {
  const session = createSession("user_1")
  const workspace = createWorkspaceSnapshot("PulseNote Ops")

  const accessState = await resolveDashboardAccessState(new Headers(), {
    getCurrentWorkspace: async () => workspace,
    getSession: async () => session,
  })

  assert.deepEqual(accessState, {
    kind: "ready",
    session,
    workspace,
  })
})

test("resolveDashboardAccessState requires explicit workspace selection when multiple memberships exist", async () => {
  const session = createSession("user_1")

  const accessState = await resolveDashboardAccessState(new Headers(), {
    getCurrentWorkspace: async () => "selection-required",
    getSession: async () => session,
  })

  assert.deepEqual(accessState, {
    kind: "workspace-selection-required",
    session,
  })
})
