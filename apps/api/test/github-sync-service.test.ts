import assert from "node:assert/strict"
import test from "node:test"

import { createGitHubSyncService } from "../src/github/service.js"
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
  assert.ok(result.releaseRecordId)
  assert.equal(result.claimCandidateCount, 1)
  assert.equal(result.evidenceBlockCount, 2)
  assert.equal(result.sourceLinkCount, 2)

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "succeeded")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, null)
  assert.notEqual(snapshot?.syncRuns[0]?.finishedAt, null)

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 1)
  assert.equal(releaseSnapshots[0]?.releaseRecord.id, result.releaseRecordId)
  assert.equal(releaseSnapshots[0]?.releaseRecord.stage, "intake")
  assert.equal(releaseSnapshots[0]?.releaseRecord.compareRange, "main...feat/api-foundation")
  assert.equal(releaseSnapshots[0]?.claimCandidates.length, 1)
  assert.equal(releaseSnapshots[0]?.claimCandidates[0]?.sentence, "Add release workflow")
  assert.deepEqual(releaseSnapshots[0]?.claimCandidates[0]?.evidenceBlockIds.length, 1)
  assert.equal(releaseSnapshots[0]?.evidenceBlocks.length, 2)
  assert.equal(releaseSnapshots[0]?.sourceLinks.length, 2)
  assert.equal(releaseSnapshots[0]?.reviewStatuses.length, 1)
  assert.equal(releaseSnapshots[0]?.reviewStatuses[0]?.state, "pending")
})

test("syncCompareRange marks the sync run as failed when GitHub compare throws", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("GitHub compare failed")
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

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 0)
})

test("syncCompareRange rejects client-supplied installation tokens in production", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv: {
      ...runtimeEnv,
      nodeEnv: "production",
    },
    store,
  })

  await assert.rejects(
    () =>
      service.syncCompareRange({
        auth: {
          strategy: "installation_token",
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
    /Development-only GitHub ingest is not available in production/,
  )
})

test("syncMergedPullRequests marks the sync run as succeeded and persists normalized release data", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        return [
          {
            baseRefName: "main",
            body: "Adds the first merged pull request path.",
            htmlUrl: "https://github.com/qyinm/pulsenote/pull/101",
            mergedAt: "2026-03-20T00:00:00.000Z",
            number: 101,
            title: "Add merged pull sync",
          },
          {
            baseRefName: "main",
            body: "Adds the second merged pull request path.",
            htmlUrl: "https://github.com/qyinm/pulsenote/pull/104",
            mergedAt: "2026-03-20T01:00:00.000Z",
            number: 104,
            title: "Persist pull request evidence",
          },
        ]
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv,
    store,
  })

  const result = await service.syncMergedPullRequests({
    auth: {
      strategy: "personal_access_token",
      token: "ghp_test_token",
    },
    connectionId: connection.id,
    pullNumbers: [101, 104],
    repository: {
      owner: "qyinm",
      provider: "github",
      repo: "pulsenote",
    },
    workspaceId: workspace.id,
  })

  assert.equal(result.scope, "github:repo:qyinm/pulsenote pulls:merged#101,104")
  assert.equal(result.mergedPullCount, 2)
  assert.equal(result.claimCandidateCount, 2)
  assert.equal(result.evidenceBlockCount, 2)
  assert.equal(result.sourceLinkCount, 2)
  assert.ok(result.releaseRecordId)

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "succeeded")

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 1)
  assert.equal(releaseSnapshots[0]?.releaseRecord.id, result.releaseRecordId)
  assert.equal(releaseSnapshots[0]?.releaseRecord.stage, "intake")
  assert.equal(releaseSnapshots[0]?.releaseRecord.compareRange, null)
  assert.equal(releaseSnapshots[0]?.evidenceBlocks.length, 2)
  assert.equal(releaseSnapshots[0]?.evidenceBlocks[0]?.sourceType, "pull_request")
  assert.equal(releaseSnapshots[0]?.claimCandidates.length, 2)
  assert.equal(releaseSnapshots[0]?.claimCandidates[0]?.sentence, "Add merged pull sync")
  assert.equal(releaseSnapshots[0]?.sourceLinks.length, 2)
  assert.equal(releaseSnapshots[0]?.reviewStatuses.length, 1)
  assert.equal(releaseSnapshots[0]?.reviewStatuses[0]?.state, "pending")
})

test("syncMergedPullRequests marks the sync run as failed when GitHub pull fetch throws", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("GitHub pull sync failed")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv,
    store,
  })

  await assert.rejects(
    () =>
      service.syncMergedPullRequests({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_test_token",
        },
        connectionId: connection.id,
        pullNumbers: [101, 104],
        repository: {
          owner: "qyinm",
          provider: "github",
          repo: "pulsenote",
        },
        workspaceId: workspace.id,
      }),
    /GitHub pull sync failed/,
  )

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "failed")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, "GitHub pull sync failed")

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 0)
})

test("syncMergedPullRequests rejects unmerged pulls before persisting release records", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        return [
          {
            baseRefName: "main",
            body: "Not merged yet.",
            htmlUrl: "https://github.com/qyinm/pulsenote/pull/105",
            mergedAt: null,
            number: 105,
            title: "Unmerged pull request",
          },
        ]
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv,
    store,
  })

  await assert.rejects(
    () =>
      service.syncMergedPullRequests({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_test_token",
        },
        connectionId: connection.id,
        pullNumbers: [105],
        repository: {
          owner: "qyinm",
          provider: "github",
          repo: "pulsenote",
        },
        workspaceId: workspace.id,
      }),
    /Pull request #105 is not merged/,
  )

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "failed")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, "Pull request #105 is not merged")

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 0)
})

test("syncRelease marks the sync run as succeeded and persists release intake data", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease({ release }) {
        assert.equal(release.releaseId, 9001)

        return {
          assets: [
            {
              contentType: "application/zip",
              downloadUrl: "https://github.com/qyinm/pulsenote/releases/download/v1.4.0/pulsenote.zip",
              name: "pulsenote.zip",
              size: 1024,
            },
          ],
          body: "## Highlights\n\n- Adds release intake routes.\n- Persists normalized records.\n",
          createdAt: "2026-03-20T00:00:00.000Z",
          draft: false,
          htmlUrl: "https://github.com/qyinm/pulsenote/releases/tag/v1.4.0",
          id: 9001,
          name: "API Foundation",
          prerelease: false,
          publishedAt: "2026-03-20T02:00:00.000Z",
          tagName: "v1.4.0",
          targetCommitish: "main",
        }
      },
    } as any,
    runtimeEnv,
    store,
  })

  const result = await service.syncRelease({
    auth: {
      strategy: "personal_access_token",
      token: "ghp_test_token",
    },
    connectionId: connection.id,
    release: {
      releaseId: 9001,
    },
    repository: {
      owner: "qyinm",
      provider: "github",
      repo: "pulsenote",
    },
    workspaceId: workspace.id,
  })

  assert.equal(result.scope, "github:repo:qyinm/pulsenote release:v1.4.0#9001")
  assert.equal(result.claimCandidateCount, 0)
  assert.equal(result.evidenceBlockCount, 1)
  assert.equal(result.sourceLinkCount, 3)
  assert.ok(result.releaseRecordId)

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "succeeded")

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 1)
  assert.equal(releaseSnapshots[0]?.releaseRecord.id, result.releaseRecordId)
  assert.equal(releaseSnapshots[0]?.releaseRecord.title, "API Foundation")
  assert.equal(releaseSnapshots[0]?.releaseRecord.compareRange, null)
  assert.equal(releaseSnapshots[0]?.evidenceBlocks.length, 1)
  assert.equal(releaseSnapshots[0]?.evidenceBlocks[0]?.sourceType, "release")
  assert.equal(releaseSnapshots[0]?.evidenceBlocks[0]?.sourceRef, "9001")
  assert.equal(releaseSnapshots[0]?.sourceLinks.length, 3)
  assert.equal(releaseSnapshots[0]?.reviewStatuses.length, 1)
  assert.equal(releaseSnapshots[0]?.reviewStatuses[0]?.state, "pending")
})

test("syncRelease marks the sync run as failed when GitHub release lookup throws", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("GitHub release sync failed")
      },
    } as any,
    runtimeEnv,
    store,
  })

  await assert.rejects(
    () =>
      service.syncRelease({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_test_token",
        },
        connectionId: connection.id,
        release: {
          tag: "v1.4.0",
        },
        repository: {
          owner: "qyinm",
          provider: "github",
          repo: "pulsenote",
        },
        workspaceId: workspace.id,
      }),
    /GitHub release sync failed/,
  )

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 1)
  assert.equal(snapshot?.syncRuns[0]?.status, "failed")
  assert.equal(snapshot?.syncRuns[0]?.errorMessage, "GitHub release sync failed")

  const releaseSnapshots = await store.listReleaseRecordSnapshots(workspace.id)
  assert.equal(releaseSnapshots.length, 0)
})

test("syncRelease rejects selectors that are not exactly one of tag or releaseId", async () => {
  const { connection, store, workspace } = await createWorkspaceContext()
  const service = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    } as any,
    runtimeEnv,
    store,
  })

  await assert.rejects(
    () =>
      service.syncRelease({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_test_token",
        },
        connectionId: connection.id,
        release: {
          releaseId: 9001,
          tag: "v1.4.0",
        },
        repository: {
          owner: "qyinm",
          provider: "github",
          repo: "pulsenote",
        },
        workspaceId: workspace.id,
      }),
    /release selector must provide exactly one of release.tag or release.releaseId/,
  )

  const snapshot = await store.getWorkspaceSnapshot(workspace.id)
  assert.equal(snapshot?.syncRuns.length, 0)
})
