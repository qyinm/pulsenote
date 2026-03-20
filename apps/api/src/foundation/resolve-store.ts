import { createDatabaseClient } from "../db/client.js"
import type { AppRuntimeEnv } from "../types.js"
import { createPostgresFoundationStore } from "./postgres-store.js"
import { createInMemoryFoundationStore, type FoundationStore } from "./store.js"

type FoundationStoreRuntimeDependencies = {
  createDatabaseClient: typeof createDatabaseClient
  createInMemoryFoundationStore: typeof createInMemoryFoundationStore
  createPostgresFoundationStore: typeof createPostgresFoundationStore
}

const defaultDependencies: FoundationStoreRuntimeDependencies = {
  createDatabaseClient,
  createInMemoryFoundationStore,
  createPostgresFoundationStore,
}

export function createFoundationStoreForRuntime(
  runtimeEnv: AppRuntimeEnv,
  dependencies: FoundationStoreRuntimeDependencies = defaultDependencies,
): FoundationStore {
  if (!runtimeEnv.databaseUrl) {
    return dependencies.createInMemoryFoundationStore()
  }

  const { db } = dependencies.createDatabaseClient(runtimeEnv.databaseUrl)
  return dependencies.createPostgresFoundationStore(db)
}
