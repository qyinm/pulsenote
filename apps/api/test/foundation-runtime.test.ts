import assert from "node:assert/strict"
import test from "node:test"

import { createFoundationStoreForRuntime } from "../src/foundation/resolve-store.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"
import { getRuntimeEnv } from "../src/lib/env.js"

test("runtime env reads DATABASE_URL when present", () => {
  const runtimeEnv = getRuntimeEnv({
    APP_NAME: "pulsenote-api",
    APP_VERSION: "0.1.0",
    DATABASE_URL: "postgres://user:pass@localhost:5432/pulsenote",
    HOST: "127.0.0.1",
    NODE_ENV: "development",
    PORT: "8787",
  })

  assert.equal(runtimeEnv.databaseUrl, "postgres://user:pass@localhost:5432/pulsenote")
})

test("createFoundationStoreForRuntime falls back to in-memory without DATABASE_URL", async () => {
  const store = createFoundationStoreForRuntime({
    appName: "pulsenote-api-test",
    appVersion: "test",
    databaseUrl: null,
    host: "127.0.0.1",
    nodeEnv: "test",
    port: 9999,
  })
  const service = createFoundationService(store)

  const bootstrap = await service.bootstrapWorkspace({
    user: {
      email: "runtime@pulsenote.dev",
      fullName: "Runtime User",
    },
    workspace: {
      name: "Runtime workspace",
      slug: "runtime-workspace",
    },
  })

  const snapshot = await service.getWorkspaceSnapshot(bootstrap.workspace.id)

  assert.equal(snapshot.workspace.slug, "runtime-workspace")
  assert.equal(snapshot.memberships.length, 1)
})

test("createFoundationStoreForRuntime uses postgres factory when DATABASE_URL is present", () => {
  const fakeStore = createInMemoryFoundationStore()
  const calls: { databaseUrl: string; db: { tag: string } }[] = []

  const store = createFoundationStoreForRuntime(
    {
      appName: "pulsenote-api-test",
      appVersion: "test",
      databaseUrl: "postgres://postgres:postgres@localhost:5432/pulsenote",
      host: "127.0.0.1",
      nodeEnv: "test",
      port: 9999,
    },
    {
      createDatabaseClient(databaseUrl) {
        const db = { tag: "db-client" }
        calls.push({ databaseUrl, db })
        return {
          db,
          pool: {} as never,
        }
      },
      createInMemoryFoundationStore,
      createPostgresFoundationStore(db) {
        assert.deepEqual(db, { tag: "db-client" })
        return fakeStore
      },
    },
  )

  assert.equal(store, fakeStore)
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.databaseUrl, "postgres://postgres:postgres@localhost:5432/pulsenote")
})
