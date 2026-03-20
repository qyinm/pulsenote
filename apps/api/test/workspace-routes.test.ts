import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  betterAuthSecret: null,
  betterAuthUrl: null,
  databaseUrl: null,
  host: "127.0.0.1",
  nodeEnv: "test" as const,
  port: 9999,
  trustedOrigins: [],
}

function createAuthService(session: AuthSession): AuthService {
  return {
    async getSession() {
      return session
    },
    async handler() {
      return Response.json({ ok: true })
    },
    isConfigured: true,
  }
}

function createAuthenticatedSession(userId: string): AuthSession {
  return {
    session: {
      createdAt: "2026-03-20T00:00:00.000Z",
      expiresAt: "2026-03-27T00:00:00.000Z",
      id: `session_${userId}`,
      token: `token_${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
      userId,
    },
    user: {
      createdAt: "2026-03-20T00:00:00.000Z",
      email: `${userId}@pulsenote.dev`,
      emailVerified: false,
      id: userId,
      image: null,
      name: `User ${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

test("workspace routes bootstrap a workspace and return its snapshot", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "owner@pulsenote.dev",
        fullName: "Owner User",
      },
      workspace: {
        name: "Owner workspace",
        slug: "owner-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(bootstrapResponse.status, 201)

  const bootstrapBody = await bootstrapResponse.json()
  assert.equal(bootstrapBody.workspace.slug, "owner-workspace")

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })
  const snapshotResponse = await app.request(`/v1/workspaces/${bootstrapBody.workspace.id}`)
  assert.equal(snapshotResponse.status, 200)

  const snapshotBody = await snapshotResponse.json()
  assert.equal(snapshotBody.workspace.name, "Owner workspace")
  assert.equal(snapshotBody.memberships[0]?.role, "owner")
})

test("workspace routes create integrations and sync runs", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "ops@pulsenote.dev",
        fullName: "Ops User",
      },
      workspace: {
        name: "Ops workspace",
        slug: "ops-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const integrationResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations`,
    {
      body: JSON.stringify({
        externalAccountId: "github-installation-101",
        provider: "github",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(integrationResponse.status, 201)
  const integrationBody = await integrationResponse.json()
  assert.equal(integrationBody.provider, "github")

  const syncRunResponse = await app.request(`/v1/workspaces/${bootstrapBody.workspace.id}/sync-runs`, {
    body: JSON.stringify({
      connectionId: integrationBody.id,
      scope: "repo:qyinm/pulsenote compare:main...HEAD",
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(syncRunResponse.status, 201)

  const snapshotResponse = await app.request(`/v1/workspaces/${bootstrapBody.workspace.id}`)
  const snapshotBody = await snapshotResponse.json()

  assert.equal(snapshotBody.integrations.length, 1)
  assert.equal(snapshotBody.syncRuns.length, 1)
  assert.equal(snapshotBody.syncRuns[0]?.scope, "repo:qyinm/pulsenote compare:main...HEAD")
})

test("workspace routes reject unsupported integration providers", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "invalid-provider@pulsenote.dev",
        fullName: "Ops User",
      },
      workspace: {
        name: "Validation workspace",
        slug: "validation-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const integrationResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations`,
    {
      body: JSON.stringify({
        externalAccountId: "invalid-provider-installation",
        provider: "jira",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(integrationResponse.status, 400)
  assert.deepEqual(await integrationResponse.json(), {
    message: "provider and externalAccountId are required",
    status: 400,
  })
})

test("workspace routes return the current workspace for the authenticated user", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "current-workspace@pulsenote.dev",
        fullName: "Current Workspace User",
      },
      workspace: {
        name: "Current workspace",
        slug: "current-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/current")

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.workspace.id, bootstrapBody.workspace.id)
})

test("workspace routes reject anonymous current workspace lookups", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/current")

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    message: "Authentication is required",
    status: 401,
  })
})

test("workspace routes return 404 when the authenticated user has no current workspace", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession("orphan-user")),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/current")

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    message: "Current workspace was not found for user orphan-user",
    status: 404,
  })
})
