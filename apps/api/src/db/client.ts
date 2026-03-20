import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema.js"

export type DatabaseClient = NodePgDatabase<typeof schema>

type CreateDatabaseClientDependencies = {
  PoolClass?: typeof Pool
  logError?: typeof console.error
}

export function createDatabaseClient(
  databaseUrl: string,
  dependencies: CreateDatabaseClientDependencies = {},
) {
  const PoolClass = dependencies.PoolClass ?? Pool
  const logError = dependencies.logError ?? console.error
  const pool = new PoolClass({
    connectionString: databaseUrl,
  })

  pool.on("error", (error) => {
    logError(
      JSON.stringify({
        error: error.message,
        event: "db.pool.error",
        timestamp: new Date().toISOString(),
      }),
    )
  })

  const db = drizzle({ client: pool, schema })

  return {
    db,
    pool,
  }
}
