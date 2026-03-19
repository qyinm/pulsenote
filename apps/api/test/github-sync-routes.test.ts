import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"
import { createGitHubSyncService } from "../src/github/service.js"

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

async function bootstrapWorkspace() {
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
  const connection = await foundationService.createIntegrationConnection({
    externalAccountId: "github-installation-900",
    provider: "github",
    workspaceId: bootstrap.workspace.id,
  })

  return {
    bootstrap,
    connection,
    foundationService,
    store,
  }
}

test("github compare sync route returns comparison data for workspace members", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        return {
          aheadBy: 1,
          behindBy: 0,
          commits: [
            {
              committedAt: "2026-03-20T00:00:00.000Z",
              message: "Add compare sync",
              sha: "abc123",
            },
          ],
          files: [],
          mergeBaseSha: "base123",
          totalCommits: 1,
        }
      },
    },
    runtimeEnv,
    store,
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/compare`, {
    body: JSON.stringify({
      auth: {
        strategy: "personal_access_token",
        token: "ghp_dev_token",
      },
      compare: {
        base: "main",
        head: "feat/api-foundation",
      },
      connectionId: connection.id,
      repository: {
        owner: "qyinm",
        repo: "pulsenote",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.comparison.totalCommits, 1)
  assert.equal(body.scope, "github:repo:qyinm/pulsenote compare:main...feat/api-foundation")
})

test("github compare sync route rejects development-only ingest in production", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const productionEnv = {
    ...runtimeEnv,
    nodeEnv: "production" as const,
  }
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("should not be called")
      },
    },
    runtimeEnv: productionEnv,
    store,
  })

  const app = createApp(productionEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/compare`, {
    body: JSON.stringify({
      auth: {
        strategy: "personal_access_token",
        token: "ghp_dev_token",
      },
      compare: {
        base: "main",
        head: "feat/api-foundation",
      },
      connectionId: connection.id,
      repository: {
        owner: "qyinm",
        repo: "pulsenote",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Development-only GitHub ingest is not available in production",
    status: 403,
  })
})
