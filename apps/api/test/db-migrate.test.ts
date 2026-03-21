import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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

test("0003 migration creates composite uniqueness before dependent integration connection foreign keys", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0003_powerful_silver_samurai.sql", import.meta.url),
    "utf8",
  )

  const uniqueConstraintIndex = migrationSql.indexOf(
    'ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_id_workspace_id_unique" UNIQUE("id","workspace_id");',
  )
  const releaseRecordsConstraintIndex = migrationSql.indexOf(
    'ALTER TABLE "release_records" ADD CONSTRAINT "release_records_connection_id_workspace_id_integration_connections_fk" FOREIGN KEY ("connection_id","workspace_id") REFERENCES "public"."integration_connections"("id","workspace_id") ON DELETE cascade ON UPDATE no action;',
  )
  const syncRunsConstraintIndex = migrationSql.indexOf(
    'ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connection_id_workspace_id_integration_connections_fk" FOREIGN KEY ("connection_id","workspace_id") REFERENCES "public"."integration_connections"("id","workspace_id") ON DELETE cascade ON UPDATE no action;',
  )

  assert.notEqual(uniqueConstraintIndex, -1)
  assert.notEqual(releaseRecordsConstraintIndex, -1)
  assert.notEqual(syncRunsConstraintIndex, -1)
  assert.ok(uniqueConstraintIndex < releaseRecordsConstraintIndex)
  assert.ok(uniqueConstraintIndex < syncRunsConstraintIndex)
})

test("0006 migration uses non-colliding constraint names for draft claim check evidence links", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0006_ambitious_mordo.sql", import.meta.url),
    "utf8",
  )

  assert.match(
    migrationSql,
    /CONSTRAINT "draft_claim_check_result_evidence_blocks_pk" PRIMARY KEY/,
  )
  assert.ok(
    !migrationSql.includes(
      'CONSTRAINT "draft_claim_check_result_evidence_blocks_draft_claim_check_result_id_evidence_block_id_pk" PRIMARY KEY',
    ),
  )
})
