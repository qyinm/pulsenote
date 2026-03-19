import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema.js"

export type DatabaseClient = NodePgDatabase<typeof schema>

export function createDatabaseClient(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
  })

  const db = drizzle({ client: pool, schema })

  return {
    db,
    pool,
  }
}
