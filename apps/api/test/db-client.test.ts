import assert from "node:assert/strict"
import test from "node:test"

import { createDatabaseClient } from "../src/db/client.js"

test("createDatabaseClient logs pool errors through the configured handler", () => {
  let errorHandler: ((error: Error) => void) | undefined
  const logs: string[] = []

  class FakePool {
    constructor(public readonly options: { connectionString: string }) {}

    on(event: string, handler: (error: Error) => void) {
      assert.equal(event, "error")
      errorHandler = handler
      return this
    }
  }

  const client = createDatabaseClient("postgres://pulsenote:test@localhost:5432/pulsenote", {
    logError(message) {
      logs.push(message)
    },
    PoolClass: FakePool as unknown as typeof import("pg").Pool,
  })

  assert.ok(client.db)
  assert.ok(client.pool)
  assert.ok(errorHandler)

  errorHandler?.(new Error("database unavailable"))

  assert.equal(logs.length, 1)
  const payload = JSON.parse(logs[0]!)
  assert.equal(payload.event, "db.pool.error")
  assert.equal(payload.error, "database unavailable")
  assert.match(payload.timestamp, /\d{4}-\d{2}-\d{2}T/)
})
