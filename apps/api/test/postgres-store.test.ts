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
                throw new Error("duplicate key value violates unique constraint \"workspaces_slug_unique\"")
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
    /workspaces_slug_unique/,
  )

  assert.equal(transactionCalls, 1)
  assert.deepEqual(committedTables, [])
})

test("postgres getReleaseRecordSnapshot scopes claim-evidence link queries to release claim candidates", async () => {
  let claimLinkArgs: Record<string, unknown> | undefined

  const db = {
    query: {
      claimCandidates: {
        async findMany() {
          return [
            {
              createdAt: "2026-03-20T00:00:00.000Z",
              id: "claim_1",
              releaseRecordId: "release_1",
              sentence: "Add release intake routes",
              status: "pending",
              updatedAt: "2026-03-20T00:00:00.000Z",
            },
          ]
        },
      },
      claimCandidateEvidenceBlocks: {
        async findMany(args: Record<string, unknown>) {
          claimLinkArgs = args
          return [
            {
              claimCandidateId: "claim_1",
              createdAt: "2026-03-20T00:00:00.000Z",
              evidenceBlockId: "evidence_1",
            },
          ]
        },
      },
      evidenceBlocks: {
        async findMany() {
          return [
            {
              body: "Release notes",
              capturedAt: "2026-03-20T00:00:00.000Z",
              evidenceState: "fresh",
              id: "evidence_1",
              provider: "github",
              releaseRecordId: "release_1",
              sourceRef: "9001",
              sourceType: "release",
              title: "Release v1.4.0",
            },
          ]
        },
      },
      releaseRecords: {
        async findFirst() {
          return {
            compareRange: null,
            connectionId: "connection_1",
            createdAt: "2026-03-20T00:00:00.000Z",
            id: "release_1",
            stage: "intake",
            summary: "summary",
            title: "title",
            updatedAt: "2026-03-20T00:00:00.000Z",
            workspaceId: "workspace_1",
          }
        },
      },
      reviewStatuses: {
        async findMany() {
          return []
        },
      },
      sourceLinks: {
        async findMany() {
          return []
        },
      },
    },
  }

  const store = createPostgresFoundationStore(db as never)
  const snapshot = await store.getReleaseRecordSnapshot("release_1")

  assert.ok(snapshot)
  assert.ok(claimLinkArgs)
  assert.ok(claimLinkArgs?.where)
})

test("postgres getWorkspaceSnapshot scopes account and cursor queries to workspace integrations", async () => {
  let integrationAccountArgs: Record<string, unknown> | undefined
  let sourceCursorArgs: Record<string, unknown> | undefined

  const db = {
    query: {
      integrationAccounts: {
        async findMany(args: Record<string, unknown>) {
          integrationAccountArgs = args
          return []
        },
      },
      integrationConnections: {
        async findMany() {
          return [
            {
              connectedAt: "2026-03-20T00:00:00.000Z",
              externalAccountId: "github-installation-42",
              id: "connection_1",
              lastSyncedAt: null,
              provider: "github",
              status: "active",
              workspaceId: "workspace_1",
            },
          ]
        },
      },
      sourceCursors: {
        async findMany(args: Record<string, unknown>) {
          sourceCursorArgs = args
          return []
        },
      },
      syncRuns: {
        async findMany() {
          return []
        },
      },
      workspaceMemberships: {
        async findMany() {
          return []
        },
      },
      workspaces: {
        async findFirst() {
          return {
            createdAt: "2026-03-20T00:00:00.000Z",
            id: "workspace_1",
            name: "PulseNote",
            slug: "pulsenote",
            updatedAt: "2026-03-20T00:00:00.000Z",
          }
        },
      },
    },
  }

  const store = createPostgresFoundationStore(db as never)
  const snapshot = await store.getWorkspaceSnapshot("workspace_1")

  assert.ok(snapshot)
  assert.ok(integrationAccountArgs?.where)
  assert.ok(sourceCursorArgs?.where)
})
