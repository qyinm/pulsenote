import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"
import type { GitHubInstallationService } from "../src/github/installation.js"

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

test("workspace routes manage the GitHub intake connection for an authenticated workspace", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "github-settings@pulsenote.dev",
        fullName: "GitHub Settings User",
      },
      workspace: {
        name: "GitHub settings workspace",
        slug: "github-settings-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const githubInstallationService: GitHubInstallationService = {
    async createInstallationAuth(installationId) {
      return {
        strategy: "installation_token",
        token: `installation_token_${installationId}`,
      }
    },
    getInstallUrl(input) {
      assert.equal(input.userId, bootstrapBody.memberships[0].userId)
      assert.equal(input.workspaceId, bootstrapBody.workspace.id)
      return "https://github.com/apps/pulsenote/installations/new?state=install_state_123"
    },
    verifyInstallState(input) {
      assert.equal(input.userId, bootstrapBody.memberships[0].userId)
      assert.equal(input.workspaceId, bootstrapBody.workspace.id)
      assert.equal(input.state, "install_state_123")
    },
    async listInstallationRepositories(installationId) {
      assert.equal(installationId, "321")
      return [
        {
          defaultBranch: "main",
          fullName: "qyinm/pulsenote",
          id: 1,
          name: "pulsenote",
          owner: "qyinm",
          url: "https://github.com/qyinm/pulsenote",
        },
      ]
    },
  }
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
    githubInstallationService,
  })

  const installUrlResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github/install-url`,
  )

  assert.equal(installUrlResponse.status, 200)
  assert.deepEqual(await installUrlResponse.json(), {
    url: "https://github.com/apps/pulsenote/installations/new?state=install_state_123",
  })

  const repositoriesResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github/installations/321/repositories?state=install_state_123`,
  )

  assert.equal(repositoriesResponse.status, 200)
  assert.deepEqual(await repositoriesResponse.json(), [
    {
      defaultBranch: "main",
      fullName: "qyinm/pulsenote",
      id: 1,
      name: "pulsenote",
      owner: "qyinm",
      url: "https://github.com/qyinm/pulsenote",
    },
  ])

  const connectResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github`,
    {
      body: JSON.stringify({
        installationId: "321",
        state: "install_state_123",
        repository: {
          name: "pulsenote",
          owner: "qyinm",
          url: "https://github.com/qyinm/pulsenote",
        },
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  )

  assert.equal(connectResponse.status, 200)
  const connectBody = await connectResponse.json()
  assert.equal(connectBody.installationId, "321")
  assert.equal(connectBody.repositoryName, "pulsenote")
  assert.equal(connectBody.repositoryOwner, "qyinm")
  assert.equal(connectBody.status, "active")

  const connectionResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github`,
  )

  assert.equal(connectionResponse.status, 200)
  const connectionBody = await connectionResponse.json()
  assert.equal(connectionBody.connectionId, connectBody.connectionId)
  assert.equal(connectionBody.repositoryUrl, "https://github.com/qyinm/pulsenote")

  const disconnectResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github`,
    {
      method: "DELETE",
    },
  )

  assert.equal(disconnectResponse.status, 204)

  const missingConnectionResponse = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github`,
  )

  assert.equal(missingConnectionResponse.status, 404)
  assert.deepEqual(await missingConnectionResponse.json(), {
    message: "GitHub connection was not found",
    status: 404,
  })
})

test("workspace routes reject GitHub installation repository listing without signed install state", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "missing-state@pulsenote.dev",
        fullName: "Missing State User",
      },
      workspace: {
        name: "Missing state workspace",
        slug: "missing-state-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const githubInstallationService: GitHubInstallationService = {
    async createInstallationAuth(installationId) {
      return {
        strategy: "installation_token",
        token: `installation_token_${installationId}`,
      }
    },
    getInstallUrl() {
      return "https://github.com/apps/pulsenote/installations/new?state=install_state_123"
    },
    verifyInstallState() {
      throw new Error("verifyInstallState should not be called without a state")
    },
    async listInstallationRepositories() {
      throw new Error("listInstallationRepositories should not be called without a state")
    },
  }
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
    githubInstallationService,
  })

  const response = await app.request(
    `/v1/workspaces/${bootstrapBody.workspace.id}/integrations/github/installations/321/repositories`,
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    message: "state is required",
    status: 400,
  })
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

test("workspace routes bootstrap a workspace for the authenticated current user", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession("auth_user_1")),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/bootstrap-current-user", {
    body: JSON.stringify({
      workspace: {
        name: "Auth workspace",
        slug: "auth-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(response.status, 201)

  const body = await response.json()
  assert.equal(body.workspace.slug, "auth-workspace")
  assert.equal(body.memberships[0]?.userId, "auth_user_1")

  const currentWorkspaceResponse = await app.request("/v1/workspaces/current")
  assert.equal(currentWorkspaceResponse.status, 200)

  const currentWorkspaceBody = await currentWorkspaceResponse.json()
  assert.equal(currentWorkspaceBody.workspace.id, body.workspace.id)
})

test("workspace routes return 409 when the authenticated current user reuses a workspace slug", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession("auth_user_1")),
    foundationService,
  })

  const firstResponse = await app.request("/v1/workspaces/bootstrap-current-user", {
    body: JSON.stringify({
      workspace: {
        name: "Auth workspace",
        slug: "auth-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(firstResponse.status, 201)

  const secondResponse = await app.request("/v1/workspaces/bootstrap-current-user", {
    body: JSON.stringify({
      workspace: {
        name: "Duplicate auth workspace",
        slug: "auth-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  assert.equal(secondResponse.status, 409)
  assert.deepEqual(await secondResponse.json(), {
    message: 'Workspace slug "auth-workspace" is already in use',
    status: 409,
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
    message: "Current workspace was not found",
    status: 404,
  })
})

test("workspace routes return 409 when the authenticated user belongs to multiple workspaces", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "multi-workspace@pulsenote.dev",
        fullName: "Multi Workspace User",
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
  const secondWorkspace = await store.createWorkspace({
    name: "Operations",
    slug: "operations",
  })

  await store.createWorkspaceMembership({
    role: "member",
    userId: bootstrapBody.memberships[0].userId,
    workspaceId: secondWorkspace.id,
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/current")

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    message: "Multiple workspaces found; specify the current workspace before loading the dashboard",
    status: 409,
  })
})

test("workspace routes list workspace choices and persist the current workspace selection", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "workspace-choice@pulsenote.dev",
        fullName: "Workspace Choice User",
      },
      workspace: {
        name: "Primary workspace",
        slug: "primary-workspace",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const secondWorkspace = await store.createWorkspace({
    name: "Second workspace",
    slug: "second-workspace",
  })

  await store.createWorkspaceMembership({
    role: "member",
    userId: bootstrapBody.memberships[0].userId,
    workspaceId: secondWorkspace.id,
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const choicesResponse = await app.request("/v1/workspaces/choices")
  assert.equal(choicesResponse.status, 200)

  const choicesBody = await choicesResponse.json()
  assert.equal(choicesBody.length, 2)
  assert.equal(choicesBody[1]?.workspace.id, secondWorkspace.id)

  const selectionResponse = await app.request("/v1/workspaces/current", {
    body: JSON.stringify({
      workspaceId: secondWorkspace.id,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "PUT",
  })

  assert.equal(selectionResponse.status, 200)

  const currentWorkspaceResponse = await app.request("/v1/workspaces/current")
  assert.equal(currentWorkspaceResponse.status, 200)

  const currentWorkspaceBody = await currentWorkspaceResponse.json()
  assert.equal(currentWorkspaceBody.workspace.id, secondWorkspace.id)
})

test("workspace routes return 403 when selecting a workspace without membership access", async () => {
  const store = createInMemoryFoundationStore()
  const foundationService = createFoundationService(store)
  const bootstrapApp = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const bootstrapResponse = await bootstrapApp.request("/v1/workspaces/bootstrap", {
    body: JSON.stringify({
      user: {
        email: "selection-access@pulsenote.dev",
        fullName: "Selection Access User",
      },
      workspace: {
        name: "Primary workspace",
        slug: "selection-access-primary",
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  const bootstrapBody = await bootstrapResponse.json()
  const foreignWorkspace = await store.createWorkspace({
    name: "Foreign workspace",
    slug: "selection-access-foreign",
  })

  const app = createApp(runtimeEnv, {
    authService: createAuthService(createAuthenticatedSession(bootstrapBody.memberships[0].userId)),
    foundationService,
  })

  const response = await app.request("/v1/workspaces/current", {
    body: JSON.stringify({
      workspaceId: foreignWorkspace.id,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "PUT",
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: "Workspace access is not allowed",
    status: 403,
  })
})
