import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  autoRunMigrations: false,
  betterAuthCookieDomain: null,
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

test("workspace snapshot rejects anonymous requests", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrap = await foundationService.bootstrapWorkspace({
    user: {
      email: "owner@pulsenote.dev",
      fullName: "Owner User",
    },
    workspace: {
      name: "Owner workspace",
      slug: "owner-workspace",
    },
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}`)

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    message: "Authentication is required",
    status: 401,
  })
})

test("workspace snapshot rejects authenticated users outside the workspace", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrap = await foundationService.bootstrapWorkspace({
    user: {
      email: "owner@pulsenote.dev",
      fullName: "Owner User",
    },
    workspace: {
      name: "Owner workspace",
      slug: "owner-workspace",
    },
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession("outsider")),
    foundationService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}`)

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Workspace access is not allowed",
    status: 403,
  })
})

test("workspace routes allow members to read and mutate their workspace", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrap = await foundationService.bootstrapWorkspace({
    user: {
      email: "owner@pulsenote.dev",
      fullName: "Owner User",
    },
    workspace: {
      name: "Owner workspace",
      slug: "owner-workspace",
    },
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
  })

  const snapshotResponse = await app.request(`/v1/workspaces/${bootstrap.workspace.id}`)
  assert.equal(snapshotResponse.status, 200)

  const integrationResponse = await app.request(
    `/v1/workspaces/${bootstrap.workspace.id}/integrations`,
    {
      body: JSON.stringify({
        externalAccountId: "github-installation-202",
        provider: "github",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(integrationResponse.status, 201)
})
