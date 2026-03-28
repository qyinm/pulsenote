import assert from "node:assert/strict"
import test from "node:test"

import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

test("bootstrapWorkspace creates a workspace, owner membership, and empty snapshot", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const bootstrap = await service.bootstrapWorkspace({
    user: {
      email: "grace@pulsenote.dev",
      fullName: "Grace Lee",
    },
    workspace: {
      name: "PulseNote",
      slug: "pulsenote",
    },
  })

  assert.equal(bootstrap.user.email, "grace@pulsenote.dev")
  assert.equal(bootstrap.workspace.slug, "pulsenote")
  assert.equal(bootstrap.membership.role, "owner")

  const snapshot = await service.getWorkspaceSnapshot(bootstrap.workspace.id)

  assert.equal(snapshot.workspace.name, "PulseNote")
  assert.equal(snapshot.memberships.length, 1)
  assert.equal(snapshot.integrations.length, 0)
  assert.equal(snapshot.syncRuns.length, 0)
})

test("creating integrations and sync runs attaches them to the workspace snapshot", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const bootstrap = await service.bootstrapWorkspace({
    user: {
      email: "ivy@pulsenote.dev",
      fullName: "Ivy Song",
    },
    workspace: {
      name: "Sample workspace",
      slug: "sample-workspace",
    },
  })

  const integration = await service.createIntegrationConnection({
    externalAccountId: "github-installation-42",
    provider: "github",
    workspaceId: bootstrap.workspace.id,
  })

  const syncRun = await service.createSyncRun({
    connectionId: integration.id,
    scope: "repo:pulsenote compare:main...feat/api-foundation",
    workspaceId: bootstrap.workspace.id,
  })

  const snapshot = await service.getWorkspaceSnapshot(bootstrap.workspace.id)

  assert.equal(snapshot.integrations.length, 1)
  assert.equal(snapshot.integrations[0]?.provider, "github")
  assert.equal(snapshot.syncRuns.length, 1)
  assert.equal(snapshot.syncRuns[0]?.id, syncRun.id)
  assert.equal(snapshot.syncRuns[0]?.connectionId, integration.id)
  assert.equal(snapshot.syncRuns[0]?.status, "queued")
})

test("createSyncRun rejects connections from another workspace", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const first = await service.bootstrapWorkspace({
    user: { email: "first@pulsenote.dev", fullName: "First User" },
    workspace: { name: "First workspace", slug: "first-workspace" },
  })

  const second = await service.bootstrapWorkspace({
    user: { email: "second@pulsenote.dev", fullName: "Second User" },
    workspace: { name: "Second workspace", slug: "second-workspace" },
  })

  const integration = await service.createIntegrationConnection({
    externalAccountId: "github-installation-7",
    provider: "github",
    workspaceId: first.workspace.id,
  })

  await assert.rejects(
    () =>
      service.createSyncRun({
        connectionId: integration.id,
        scope: "repo:pulsenote compare:v0.1.0...HEAD",
        workspaceId: second.workspace.id,
      }),
    /does not belong to workspace/,
  )
})

test("createIntegrationConnection rejects unsupported providers before persistence", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const bootstrap = await service.bootstrapWorkspace({
    user: { email: "owner@pulsenote.dev", fullName: "Owner User" },
    workspace: { name: "PulseNote", slug: "pulsenote" },
  })

  await assert.rejects(
    () =>
      service.createIntegrationConnection({
        externalAccountId: "gitlab-project-7",
        provider: "gitlab" as never,
        workspaceId: bootstrap.workspace.id,
      }),
    /provider must be one of: github, linear/,
  )
})

test("getCurrentWorkspaceSnapshotForUser returns the current workspace when the user has one membership", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const first = await service.bootstrapWorkspace({
    user: { email: "owner@pulsenote.dev", fullName: "Owner User" },
    workspace: { name: "PulseNote", slug: "pulsenote" },
  })

  await service.bootstrapWorkspace({
    user: { email: "member@pulsenote.dev", fullName: "Member User" },
    workspace: { name: "Secondary", slug: "secondary-workspace" },
  })

  const currentWorkspace = await service.getCurrentWorkspaceSnapshotForUser(first.user.id)

  assert.equal(currentWorkspace.workspace.id, first.workspace.id)
  assert.equal(currentWorkspace.memberships[0]?.userId, first.user.id)
})

test("getCurrentWorkspaceSnapshotForUser rejects ambiguous workspace membership state", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)

  const bootstrap = await service.bootstrapWorkspace({
    user: { email: "owner@pulsenote.dev", fullName: "Owner User" },
    workspace: { name: "PulseNote", slug: "pulsenote" },
  })
  const secondWorkspace = await store.createWorkspace({
    name: "Operations",
    slug: "operations",
  })

  await store.createWorkspaceMembership({
    role: "member",
    userId: bootstrap.user.id,
    workspaceId: secondWorkspace.id,
  })

  await assert.rejects(
    () => service.getCurrentWorkspaceSnapshotForUser(bootstrap.user.id),
    /Multiple workspaces found; specify the current workspace before loading the dashboard/,
  )
})

test("connectGitHubWorkspace rolls back the connection when config persistence fails", async () => {
  const store = createInMemoryFoundationStore()
  const service = createFoundationService(store)
  const bootstrap = await service.bootstrapWorkspace({
    user: { email: "owner@pulsenote.dev", fullName: "Owner User" },
    workspace: { name: "PulseNote", slug: "pulsenote" },
  })
  const originalUpsertGitHubConnectionConfig = store.upsertGitHubConnectionConfig.bind(store)

  store.upsertGitHubConnectionConfig = async (input) => {
    await originalUpsertGitHubConnectionConfig(input)
    throw new Error("config persistence failed")
  }

  await assert.rejects(
    () =>
      service.connectGitHubWorkspace({
        connectedByUserId: bootstrap.user.id,
        installationId: "321",
        repositoryName: "pulsenote",
        repositoryOwner: "qyinm",
        repositoryUrl: "https://github.com/qyinm/pulsenote",
        workspaceId: bootstrap.workspace.id,
      }),
    /config persistence failed/,
  )

  const snapshot = await service.getWorkspaceSnapshot(bootstrap.workspace.id)
  assert.equal(snapshot.integrations.length, 0)
  assert.equal(await service.getGitHubWorkspaceConnection(bootstrap.workspace.id), null)
})
