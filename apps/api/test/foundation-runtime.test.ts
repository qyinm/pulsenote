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
    BETTER_AUTH_SECRET: "test-secret-for-auth-config-1234567890",
    BETTER_AUTH_URL: "http://127.0.0.1:8787",
    DATABASE_URL: "postgres://user:pass@localhost:5432/pulsenote",
    HOST: "127.0.0.1",
    NODE_ENV: "development",
    PORT: "8787",
    TRUSTED_ORIGINS: "http://127.0.0.1:3000,http://localhost:3000",
  })

  assert.equal(runtimeEnv.betterAuthSecret, "test-secret-for-auth-config-1234567890")
  assert.equal(runtimeEnv.betterAuthUrl, "http://127.0.0.1:8787")
  assert.equal(runtimeEnv.databaseUrl, "postgres://user:pass@localhost:5432/pulsenote")
  assert.deepEqual(runtimeEnv.trustedOrigins, ["http://127.0.0.1:3000", "http://localhost:3000"])
})

test("runtime env defaults production traffic to 0.0.0.0 when HOST is not set", () => {
  const runtimeEnv = getRuntimeEnv({
    APP_NAME: "pulsenote-api",
    APP_VERSION: "0.1.0",
    NODE_ENV: "production",
    PORT: "8080",
  })

  assert.equal(runtimeEnv.host, "0.0.0.0")
  assert.equal(runtimeEnv.port, 8080)
})

test("runtime env preserves an explicit HOST override in production", () => {
  const runtimeEnv = getRuntimeEnv({
    APP_NAME: "pulsenote-api",
    APP_VERSION: "0.1.0",
    HOST: "10.0.0.5",
    NODE_ENV: "production",
  })

  assert.equal(runtimeEnv.host, "10.0.0.5")
})

test("createFoundationStoreForRuntime falls back to in-memory without DATABASE_URL", async () => {
  const store = createFoundationStoreForRuntime({
    appName: "pulsenote-api-test",
    appVersion: "test",
    betterAuthSecret: null,
    betterAuthUrl: null,
    databaseUrl: null,
    host: "127.0.0.1",
    nodeEnv: "test",
    port: 9999,
    trustedOrigins: [],
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
      betterAuthSecret: null,
      betterAuthUrl: null,
      databaseUrl: "postgres://postgres:postgres@localhost:5432/pulsenote",
      host: "127.0.0.1",
      nodeEnv: "test",
      port: 9999,
      trustedOrigins: [],
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
