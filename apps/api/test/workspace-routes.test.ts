import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  host: "127.0.0.1",
  nodeEnv: "test" as const,
  port: 9999,
}

test("workspace routes bootstrap a workspace and return its snapshot", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, { foundationService })

  const bootstrapResponse = await app.request("/v1/workspaces/bootstrap", {
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

  const snapshotResponse = await app.request(`/v1/workspaces/${bootstrapBody.workspace.id}`)
  assert.equal(snapshotResponse.status, 200)

  const snapshotBody = await snapshotResponse.json()
  assert.equal(snapshotBody.workspace.name, "Owner workspace")
  assert.equal(snapshotBody.memberships[0]?.role, "owner")
})

test("workspace routes create integrations and sync runs", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, { foundationService })

  const bootstrapResponse = await app.request("/v1/workspaces/bootstrap", {
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
