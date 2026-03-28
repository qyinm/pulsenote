import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"
import type { GitHubInstallationService } from "../src/github/installation.js"
import { createGitHubSyncService } from "../src/github/service.js"

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
  assert.ok(body.releaseRecordId)
  assert.equal(body.claimCandidateCount, 1)
  assert.equal(body.evidenceBlockCount, 1)
  assert.equal(body.sourceLinkCount, 2)
})

test("createApp reuses the injected foundation service store for default github sync routes", async () => {
  const { bootstrap, connection, foundationService } = await bootstrapWorkspace()
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubClient: {
      async compareCommits() {
        return {
          aheadBy: 1,
          behindBy: 0,
          commits: [
            {
              committedAt: "2026-03-20T00:00:00.000Z",
              message: "Add shared store wiring",
              sha: "abc123",
            },
          ],
          files: [],
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
  })

  const syncResponse = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/compare`, {
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

  assert.equal(syncResponse.status, 200)

  const releaseRecordsResponse = await app.request(
    `/v1/workspaces/${bootstrap.workspace.id}/release-records`,
  )

  assert.equal(releaseRecordsResponse.status, 200)
  const body = await releaseRecordsResponse.json()
  assert.equal(body.length, 1)
  assert.equal(body[0]?.releaseRecord.compareRange, "main...feat/api-foundation")
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
      async getPullRequests() {
        throw new Error("should not be called")
      },
      async getRelease() {
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
        strategy: "installation_token",
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

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "Client-supplied installation tokens are not supported",
    status: 400,
  })
})

test("github release sync route uses the stored GitHub App connection in production", async () => {
  const { bootstrap, foundationService, store } = await bootstrapWorkspace()
  const githubConnection = await foundationService.connectGitHubWorkspace({
    connectedByUserId: bootstrap.user.id,
    installationId: "321",
    repositoryName: "pulsenote",
    repositoryOwner: "qyinm",
    repositoryUrl: "https://github.com/qyinm/pulsenote",
    workspaceId: bootstrap.workspace.id,
  })
  const productionEnv = {
    ...runtimeEnv,
    nodeEnv: "production" as const,
  }
  const githubInstallationService: GitHubInstallationService = {
    async createInstallationAuth(installationId) {
      assert.equal(installationId, "321")
      return {
        source: "github_app_installation",
        strategy: "installation_token",
        token: "installation_token_321",
      }
    },
    getInstallUrl() {
      return "https://github.com/apps/pulsenote/installations/new"
    },
    verifyInstallState() {
      throw new Error("verifyInstallState should not be called")
    },
    async listInstallationRepositories() {
      throw new Error("repository listing should not be called")
    },
  }
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare sync should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease({ auth, release, repository }) {
        assert.equal(auth.strategy, "installation_token")
        assert.equal(auth.token, "installation_token_321")
        assert.equal(repository.owner, "qyinm")
        assert.equal(repository.repo, "pulsenote")
        assert.equal(release.tag, "v2.4.0")
        return {
          assets: [],
          body: "Release description",
          createdAt: "2026-03-20T00:00:00.000Z",
          draft: false,
          htmlUrl: "https://github.com/qyinm/pulsenote/releases/tag/v2.4.0",
          id: 42,
          name: "PulseNote v2.4.0",
          prerelease: false,
          publishedAt: "2026-03-20T00:00:00.000Z",
          tagName: "v2.4.0",
          targetCommitish: "main",
        }
      },
    },
    runtimeEnv: productionEnv,
    store,
  })

  const app = createApp(productionEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubInstallationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/release`, {
    body: JSON.stringify({
      connectionId: githubConnection.connection.id,
      release: {
        tag: "v2.4.0",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.release.tagName, "v2.4.0")
  assert.equal(body.scope, "github:repo:qyinm/pulsenote release:v2.4.0#42")
  assert.ok(body.releaseRecordId)
})

test("github release sync route returns 502 when stored installation auth is unavailable", async () => {
  const { bootstrap, foundationService, store } = await bootstrapWorkspace()
  const githubConnection = await foundationService.connectGitHubWorkspace({
    connectedByUserId: bootstrap.user.id,
    installationId: "321",
    repositoryName: "pulsenote",
    repositoryOwner: "qyinm",
    repositoryUrl: "https://github.com/qyinm/pulsenote",
    workspaceId: bootstrap.workspace.id,
  })
  const productionEnv = {
    ...runtimeEnv,
    nodeEnv: "production" as const,
  }
  const githubInstallationService: GitHubInstallationService = {
    async createInstallationAuth() {
      throw new Error("GitHub installation token request failed with 500")
    },
    getInstallUrl() {
      return "https://github.com/apps/pulsenote/installations/new"
    },
    verifyInstallState() {
      throw new Error("verifyInstallState should not be called")
    },
    async listInstallationRepositories() {
      throw new Error("repository listing should not be called")
    },
  }
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare sync should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
      },
    },
    runtimeEnv: productionEnv,
    store,
  })
  const app = createApp(productionEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubInstallationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/release`, {
    body: JSON.stringify({
      connectionId: githubConnection.connection.id,
      release: {
        tag: "v2.4.0",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {
    message: "GitHub installation token request failed with 500",
    status: 502,
  })
})

test("github compare sync route rejects unsupported auth strategies", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("should not be called")
      },
      async getPullRequests() {
        throw new Error("should not be called")
      },
      async getRelease() {
        throw new Error("should not be called")
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
        strategy: "bearer_token",
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

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message:
      "connectionId, auth.token, auth.strategy, compare.base, compare.head, repository.owner, and repository.repo are required",
    status: 400,
  })
})

test("github merged PR sync route returns persisted counts for workspace members", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
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

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(
    `/v1/workspaces/${bootstrap.workspace.id}/github/sync/merged-pulls`,
    {
      body: JSON.stringify({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_dev_token",
        },
        connectionId: connection.id,
        pullNumbers: [101, 104],
        repository: {
          owner: "qyinm",
          repo: "pulsenote",
        },
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.scope, "github:repo:qyinm/pulsenote pulls:merged#101,104")
  assert.equal(body.mergedPullCount, 2)
  assert.equal(body.claimCandidateCount, 2)
  assert.equal(body.evidenceBlockCount, 2)
  assert.equal(body.sourceLinkCount, 2)
  assert.ok(body.releaseRecordId)
})

test("github merged PR sync route rejects malformed payloads", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
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

  const response = await app.request(
    `/v1/workspaces/${bootstrap.workspace.id}/github/sync/merged-pulls`,
    {
      body: JSON.stringify({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_dev_token",
        },
        connectionId: connection.id,
        pullNumbers: [],
        repository: {
          owner: "qyinm",
          repo: "pulsenote",
        },
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message:
      "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and a non-empty pullNumbers array are required",
    status: 400,
  })
})

test("github merged PR sync route rejects development-only ingest in production", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const productionEnv = {
    ...runtimeEnv,
    nodeEnv: "production" as const,
  }
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("should not be called")
      },
      async getRelease() {
        throw new Error("release sync should not be called")
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

  const response = await app.request(
    `/v1/workspaces/${bootstrap.workspace.id}/github/sync/merged-pulls`,
    {
      body: JSON.stringify({
        auth: {
          strategy: "personal_access_token",
          token: "ghp_dev_token",
        },
        connectionId: connection.id,
        pullNumbers: [101, 104],
        repository: {
          owner: "qyinm",
          repo: "pulsenote",
        },
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Development-only GitHub ingest is not available in production",
    status: 403,
  })
})

test("github release sync route returns persisted counts for workspace members", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease({ release }) {
        assert.equal(release.tag, "v1.4.0")

        return {
          assets: [
            {
              contentType: "application/zip",
              downloadUrl: "https://github.com/qyinm/pulsenote/releases/download/v1.4.0/pulsenote.zip",
              name: "pulsenote.zip",
              size: 1024,
            },
          ],
          body: "## Highlights\n\n- Adds release intake routes.\n",
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

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/release`, {
    body: JSON.stringify({
      auth: {
        strategy: "personal_access_token",
        token: "ghp_dev_token",
      },
      connectionId: connection.id,
      release: {
        tag: "v1.4.0",
      },
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
  assert.equal(body.scope, "github:repo:qyinm/pulsenote release:v1.4.0#9001")
  assert.equal(body.claimCandidateCount, 0)
  assert.equal(body.evidenceBlockCount, 1)
  assert.equal(body.sourceLinkCount, 3)
  assert.ok(body.releaseRecordId)
})

test("github release sync route rejects selectors that are not exactly one of tag or releaseId", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const githubSyncService = createGitHubSyncService({
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

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/release`, {
    body: JSON.stringify({
      auth: {
        strategy: "personal_access_token",
        token: "ghp_dev_token",
      },
      connectionId: connection.id,
      release: {
        releaseId: 9001,
        tag: "v1.4.0",
      },
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

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message:
      "connectionId, auth.token, auth.strategy, repository.owner, repository.repo, and exactly one of release.tag or release.releaseId are required",
    status: 400,
  })
})

test("github release sync route rejects development-only ingest in production", async () => {
  const { bootstrap, connection, foundationService, store } = await bootstrapWorkspace()
  const productionEnv = {
    ...runtimeEnv,
    nodeEnv: "production" as const,
  }
  const githubSyncService = createGitHubSyncService({
    githubClient: {
      async compareCommits() {
        throw new Error("compare should not be called")
      },
      async getPullRequests() {
        throw new Error("pull sync should not be called")
      },
      async getRelease() {
        throw new Error("should not be called")
      },
    } as any,
    runtimeEnv: productionEnv,
    store,
  })

  const app = createApp(productionEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrap.user.id)),
    foundationService,
    githubSyncService,
  })

  const response = await app.request(`/v1/workspaces/${bootstrap.workspace.id}/github/sync/release`, {
    body: JSON.stringify({
      auth: {
        strategy: "personal_access_token",
        token: "ghp_dev_token",
      },
      connectionId: connection.id,
      release: {
        tag: "v1.4.0",
      },
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
