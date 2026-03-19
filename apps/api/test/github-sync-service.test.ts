import assert from "node:assert/strict"
import test from "node:test"

import { createGitHubSyncService } from "../src/github/service.js"
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

async function createWorkspaceContext() {
  const store = createInMemoryFoundationStore()
  const user = await store.createUser({
    email: "owner@pulsenote.dev",
    fullName: "Owner User",
  })
  const workspace = await store.createWorkspace({
    name: "Owner workspace",
    slug: "owner-workspace",
  })
  await store.createWorkspaceMembership({
    role: "owner",
    userId: user.id,
    workspaceId: workspace.id,
  })
  const connection = await store.createIntegrationConnection({
    externalAccountId: "github-installation-333",
    provider: "github",
    workspaceId: workspace.id,
  })

  return {
    connection,
    store,
    user,
    workspace,
  }
}

test("syncCompareRange marks the sync run as succeeded and returns compare data", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        return {
          aheadBy: 2,
          behindBy: 0,
          commits: [
            {
              committedAt: "2026-03-20T00:00:00.000Z",
              message: "Add release workflow",
              sha: "abc123",
            },
          ],
          files: [
            {
              additions: 10,
              changes: 12,
              deletions: 2,
              filename: "apps/web/app/dashboard/inbox/page.tsx",
              patch: "@@ -1 +1 @@",
              status: "modified",
            },
          ],
          mergeBaseSha: "base123",
          totalCommits: 1,
        }
      },
    },
    runtimeEnv,
    store,
  })

  const result = await service.syncCompareRange({
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
    workspaceId: workspace.id,
  })

  assert.equal(result.scope, "github:repo:qyinm/pulsenote compare:main...feat/api-foundation")
  assert.equal(result.comparison.totalCommits, 1)
  assert.equal(result.comparison.files[0]?.filename, "apps/web/app/dashboard/inbox/page.tsx")

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "succeeded")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, null)
  assert.notEqual(snapshot?.syncRuns[0]?.finishedAt, null)
})

test("syncCompareRange marks the sync run as failed when GitHub compare throws", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("GitHub compare failed")
      },
    },
    runtimeEnv,
    store,
  })

  await assert.rejects(
    () =>
      service.syncCompareRange({
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
        workspaceId: workspace.id,
      }),
    /GitHub compare failed/,
  )

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "failed")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, "GitHub compare failed")
  assert.notEqual(snapshot?.syncRuns[0]?.finishedAt, null)
})
