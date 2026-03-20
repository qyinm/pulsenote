import assert from "node:assert/strict"
import test from "node:test"

import { users, workspaceMemberships, workspaces } from "../src/db/schema.js"
import { createPostgresFoundationStore } from "../src/foundation/postgres-store.js"

test("postgres bootstrapWorkspace uses a transaction so failed bootstraps do not commit partial rows", async () => {
  const committedTables: string[] = []
  let transactionCalls = 0

  const db = {
    async transaction(callback: (tx: any) => Promise<unknown>) {
      transactionCalls += 1
      const pendingTables: string[] = []
      const tx = {
        insert(table: unknown) {
          return {
            values() {
              if (table === users) {
                pendingTables.push("users")
                return {
                  async returning() {
                    return [
                      {
                        createdAt: "2026-03-20T00:00:00.000Z",
                        email: "owner@pulsenote.dev",
                        fullName: "Owner User",
                        id: "user_1",
                        updatedAt: "2026-03-20T00:00:00.000Z",
                      },
                    ]
                  },
                }
              }

              if (table === workspaces) {
                throw new Error("duplicate key value violates unique constraint \"workspaces_slug_key\"")
              }

              if (table === workspaceMemberships) {
                pendingTables.push("workspace_memberships")
              }

              return {
                async returning() {
                  return []
                },
              }
            },
          }
        },
      }

      try {
        const result = await callback(tx)
        committedTables.push(...pendingTables)
        return result
      } catch (error) {
        return Promise.reject(error)
      }
    },
  }

  const store = createPostgresFoundationStore(db as never)

  await assert.rejects(
    () =>
      store.bootstrapWorkspace({
        user: {
          email: "owner@pulsenote.dev",
          fullName: "Owner User",
        },
        workspace: {
          name: "PulseNote",
          slug: "pulsenote",
        },
      }),
    /workspaces_slug_key/,
  )

  assert.equal(transactionCalls, 1)
  assert.deepEqual(committedTables, [])
})
