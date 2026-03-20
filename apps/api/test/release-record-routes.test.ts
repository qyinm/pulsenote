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

async function seedReleaseRecord() {
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
    externalAccountId: "github-installation-901",
    provider: "github",
    workspaceId: bootstrap.workspace.id,
  })
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        return {
          aheadBy: 1,
          behindBy: 0,
          commits: [
            {
              committedAt: "2026-03-20T00:00:00.000Z",
              message: "Add release record route",
              sha: "abc123",
            },
          ],
          files: [
            {
              additions: 5,
              changes: 7,
              deletions: 2,
              filename: "apps/api/src/routes/workspaces.ts",
              patch: "@@ -1 +1 @@",
              status: "modified",
            },
          ],
          mergeBaseSha: "base123",
          totalCommits: 1,
        }
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv,
    store,
  })

  const syncResult = await githubSyncService.syncCompareRange({
    auth: {
      strategy: "personal_access_token",
      token: "ghp_test_token",
    },
    compare: {
      base: "main",
      head: "feat/api-foundation",
    },
    connectionId: connection.id,
    repository: {
      owner: "qyinm",
      provider: "github",
      repo: "pulsenote",
    },
    workspaceId: bootstrap.workspace.id,
  })

  return {
    bootstrap,
    foundationService,
    githubSyncService,
    releaseRecordId: syncResult.releaseRecordId,
  }
}

test("release record routes list and return persisted release intake snapshots", async () => {
  const seeded = await seedReleaseRecord()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(seeded.bootstrap.user.id)),
    foundationService: seeded.foundationService,
    githubSyncService: seeded.githubSyncService,
  })

  const listResponse = await app.request(
    `/v1/workspaces/${seeded.bootstrap.workspace.id}/release-records`,
  )

  assert.equal(listResponse.status, 200)
  const listBody = await listResponse.json()
  assert.equal(listBody.length, 1)
  assert.equal(listBody[0]?.releaseRecord.id, seeded.releaseRecordId)
  assert.equal(listBody[0]?.evidenceBlocks.length, 2)
  assert.equal(listBody[0]?.claimCandidates.length, 1)

  const detailResponse = await app.request(
    `/v1/workspaces/${seeded.bootstrap.workspace.id}/release-records/${seeded.releaseRecordId}`,
  )

  assert.equal(detailResponse.status, 200)
  const detailBody = await detailResponse.json()
  assert.equal(detailBody.releaseRecord.id, seeded.releaseRecordId)
  assert.equal(detailBody.releaseRecord.stage, "intake")
  assert.equal(detailBody.sourceLinks.length, 2)
  assert.equal(detailBody.reviewStatuses[0]?.state, "pending")
})

test("release record routes reject records outside the workspace", async () => {
  const seeded = await seedReleaseRecord()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(seeded.bootstrap.user.id)),
    foundationService: seeded.foundationService,
    githubSyncService: seeded.githubSyncService,
  })

  const response = await app.request(
    `/v1/workspaces/${seeded.bootstrap.workspace.id}/release-records/missing-record`,
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    message: "Release record missing-record was not found in workspace",
    status: 404,
  })
})
