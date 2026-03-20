import assert from "node:assert/strict"
import test from "node:test"

import { createInMemoryFoundationStore } from "../src/foundation/store.js"

test("in-memory createSyncRun throws when the integration connection is missing", async () => {
  const store = createInMemoryFoundationStore()

  await assert.rejects(
    () =>
      store.createSyncRun({
        connectionId: "missing-connection",
        scope: "repo:qyinm/pulsenote compare:main...HEAD",
        workspaceId: "workspace_1",
      }),
    /Integration connection missing-connection was not found/,
  )
})
