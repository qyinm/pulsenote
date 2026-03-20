import assert from "node:assert/strict"
import test from "node:test"

import { runDatabaseMigrationsForRuntime } from "../src/db/migrate.js"

const baseRuntimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  autoRunMigrations: true,
  betterAuthCookieDomain: null,
  betterAuthSecret: null,
  betterAuthUrl: null,
  databaseUrl: "postgres://postgres:postgres@localhost:5432/pulsenote",
  host: "127.0.0.1",
  nodeEnv: "production" as const,
  port: 8787,
  trustedOrigins: ["https://app.pulsenotes.xyz"],
}

test("runDatabaseMigrationsForRuntime skips when automatic migrations are disabled", async () => {
  let createDatabaseClientCalls = 0

  await runDatabaseMigrationsForRuntime(
    {
      ...baseRuntimeEnv,
      autoRunMigrations: false,
    },
    {
      async migrate() {
        throw new Error("migrate should not run when auto migrations are disabled")
      },
      createDatabaseClient() {
        createDatabaseClientCalls += 1
        throw new Error("createDatabaseClient should not run when auto migrations are disabled")
      },
    },
  )

  assert.equal(createDatabaseClientCalls, 0)
})

test("runDatabaseMigrationsForRuntime acquires an advisory lock, runs migrations, and closes the pool", async () => {
  const calls: string[] = []

  const fakePool = {
    async end() {
      calls.push("pool.end")
    },
    async query(sql: string, params: unknown[]) {
      calls.push(`${sql} :: ${JSON.stringify(params)}`)
      return { rows: [] }
    },
  }

  const fakeDb = { kind: "db" }
  let receivedDatabaseUrl: string | null = null
  let receivedMigrationsFolder: string | null = null

  await runDatabaseMigrationsForRuntime(baseRuntimeEnv, {
    createDatabaseClient(databaseUrl) {
      receivedDatabaseUrl = databaseUrl
      return {
        db: fakeDb as never,
        pool: fakePool as never,
      }
    },
    async migrate(db, options) {
      calls.push(`migrate :: ${(db as { kind: string }).kind}`)
      receivedMigrationsFolder = options.migrationsFolder
    },
  })

  assert.equal(receivedDatabaseUrl, baseRuntimeEnv.databaseUrl)
  assert.ok(receivedMigrationsFolder?.endsWith("/apps/api/drizzle"))
  assert.deepEqual(calls, [
    'select pg_advisory_lock($1) :: [730021]',
    "migrate :: db",
    'select pg_advisory_unlock($1) :: [730021]',
    "pool.end",
  ])
})

test("runDatabaseMigrationsForRuntime always releases the advisory lock and closes the pool", async () => {
  const calls: string[] = []

  const fakePool = {
    async end() {
      calls.push("pool.end")
    },
    async query(sql: string, params: unknown[]) {
      calls.push(`${sql} :: ${JSON.stringify(params)}`)
      return { rows: [] }
    },
  }

  await assert.rejects(
    () =>
      runDatabaseMigrationsForRuntime(baseRuntimeEnv, {
        createDatabaseClient() {
          return {
            db: { kind: "db" } as never,
            pool: fakePool as never,
          }
        },
        async migrate() {
          calls.push("migrate")
          throw new Error("migration failed")
        },
      }),
    /migration failed/,
  )

  assert.deepEqual(calls, [
    'select pg_advisory_lock($1) :: [730021]',
    "migrate",
    'select pg_advisory_unlock($1) :: [730021]',
    "pool.end",
  ])
})

test("runDatabaseMigrationsForRuntime closes the pool even if advisory lock acquisition fails", async () => {
  const calls: string[] = []

  const fakePool = {
    async end() {
      calls.push("pool.end")
    },
    async query(sql: string, params: unknown[]) {
      calls.push(`${sql} :: ${JSON.stringify(params)}`)
      throw new Error("lock failed")
    },
  }

  await assert.rejects(
    () =>
      runDatabaseMigrationsForRuntime(baseRuntimeEnv, {
        createDatabaseClient() {
          return {
            db: { kind: "db" } as never,
            pool: fakePool as never,
          }
        },
        async migrate() {
          calls.push("migrate")
        },
      }),
    /lock failed/,
  )

  assert.deepEqual(calls, ['select pg_advisory_lock($1) :: [730021]', "pool.end"])
})
