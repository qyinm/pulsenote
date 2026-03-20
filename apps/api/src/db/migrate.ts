import { fileURLToPath } from "node:url"

import { migrate } from "drizzle-orm/node-postgres/migrator"

import { createDatabaseClient } from "./client.js"
import type { AppRuntimeEnv } from "../types.js"

const PULSENOTE_MIGRATION_LOCK_ID = 730021

type RunDatabaseMigrationsDependencies = {
  createDatabaseClient: typeof createDatabaseClient
  migrate: typeof migrate
}

const defaultDependencies: RunDatabaseMigrationsDependencies = {
  createDatabaseClient,
  migrate,
}

function resolveMigrationsFolder() {
  return fileURLToPath(new URL("../../drizzle", import.meta.url))
}

export async function runDatabaseMigrationsForRuntime(
  runtimeEnv: AppRuntimeEnv,
  dependencies: RunDatabaseMigrationsDependencies = defaultDependencies,
) {
  if (!runtimeEnv.databaseUrl || !runtimeEnv.autoRunMigrations) {
    return
  }

  const { db, pool } = dependencies.createDatabaseClient(runtimeEnv.databaseUrl)
  let lockAcquired = false

  try {
    await pool.query("select pg_advisory_lock($1)", [PULSENOTE_MIGRATION_LOCK_ID])
    lockAcquired = true
    await dependencies.migrate(db, {
      migrationsFolder: resolveMigrationsFolder(),
    })
  } finally {
    if (lockAcquired) {
      await pool.query("select pg_advisory_unlock($1)", [PULSENOTE_MIGRATION_LOCK_ID])
    }
    await pool.end()
  }
}
