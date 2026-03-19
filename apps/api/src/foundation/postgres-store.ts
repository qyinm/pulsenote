import { desc, eq } from "drizzle-orm"

import {
  integrationAccounts,
  integrationConnections,
  sourceCursors,
  syncRuns,
  users,
  workspaceMemberships,
  workspaces,
} from "../db/schema.js"
import type { DatabaseClient } from "../db/client.js"
import {
  type IntegrationAccount,
  type IntegrationConnection,
  type SourceCursor,
  type SyncRun,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "../domain/models.js"
import type { FoundationStore } from "./store.js"

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return crypto.randomUUID()
}

type PostgresFoundationStoreOptions = {
  db: DatabaseClient
}

export function createPostgresFoundationStore(
  dbOrOptions: DatabaseClient | PostgresFoundationStoreOptions,
): FoundationStore {
  const db = "db" in dbOrOptions ? dbOrOptions.db : dbOrOptions

  return {
    async createIntegrationAccount(input) {
      const [integrationAccount] = await db
        .insert(integrationAccounts)
        .values({
          accountLabel: input.accountLabel,
          accountUrl: input.accountUrl,
          connectionId: input.connectionId,
          createdAt: nowIso(),
          id: createId(),
          provider: input.provider,
        })
        .returning()

      return integrationAccount satisfies IntegrationAccount
    },

    async createIntegrationConnection(input) {
      const [integrationConnection] = await db
        .insert(integrationConnections)
        .values({
          connectedAt: nowIso(),
          externalAccountId: input.externalAccountId,
          id: createId(),
          lastSyncedAt: null,
          provider: input.provider,
          status: "active",
          workspaceId: input.workspaceId,
        })
        .returning()

      return integrationConnection satisfies IntegrationConnection
    },

    async createSourceCursor(input) {
      const [sourceCursor] = await db
        .insert(sourceCursors)
        .values({
          connectionId: input.connectionId,
          id: createId(),
          key: input.key,
          updatedAt: nowIso(),
          value: input.value,
        })
        .returning()

      return sourceCursor satisfies SourceCursor
    },

    async createSyncRun(input) {
      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, input.connectionId),
      })

      if (!integrationConnection) {
        throw new Error(`Integration connection ${input.connectionId} was not found`)
      }

      const [syncRun] = await db
        .insert(syncRuns)
        .values({
          connectionId: input.connectionId,
          errorMessage: null,
          finishedAt: null,
          id: createId(),
          provider: integrationConnection.provider,
          scope: input.scope,
          startedAt: nowIso(),
          status: "queued",
          workspaceId: input.workspaceId,
        })
        .returning()

      return syncRun satisfies SyncRun
    },

    async createUser(input) {
      const [user] = await db
        .insert(users)
        .values({
          createdAt: nowIso(),
          email: input.email,
          fullName: input.fullName,
          id: createId(),
          updatedAt: nowIso(),
        })
        .returning()

      return user satisfies User
    },

    async createWorkspace(input) {
      const [workspace] = await db
        .insert(workspaces)
        .values({
          createdAt: nowIso(),
          id: createId(),
          name: input.name,
          slug: input.slug,
          updatedAt: nowIso(),
        })
        .returning()

      return workspace satisfies Workspace
    },

    async createWorkspaceMembership(input) {
      const [workspaceMembership] = await db
        .insert(workspaceMemberships)
        .values({
          createdAt: nowIso(),
          id: createId(),
          role: input.role,
          userId: input.userId,
          workspaceId: input.workspaceId,
        })
        .returning()

      return workspaceMembership satisfies WorkspaceMembership
    },

    async getIntegrationConnection(connectionId) {
      const integrationConnection = await db.query.integrationConnections.findFirst({
        where: eq(integrationConnections.id, connectionId),
      })

      return integrationConnection ?? null
    },

    async getWorkspace(workspaceId) {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      })

      return workspace ?? null
    },

    async getWorkspaceSnapshot(workspaceId) {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      })

      if (!workspace) {
        return null
      }

      const [memberships, integrations, syncRunRows] = await Promise.all([
        db.query.workspaceMemberships.findMany({
          where: eq(workspaceMemberships.workspaceId, workspaceId),
        }),
        db.query.integrationConnections.findMany({
          where: eq(integrationConnections.workspaceId, workspaceId),
        }),
        db.query.syncRuns.findMany({
          orderBy: desc(syncRuns.startedAt),
          where: eq(syncRuns.workspaceId, workspaceId),
        }),
      ])

      const integrationIds = integrations.map((integration) => integration.id)

      let integrationAccountRows: IntegrationAccount[] = []
      let sourceCursorRows: SourceCursor[] = []

      if (integrationIds.length > 0) {
        integrationAccountRows = await db.query.integrationAccounts.findMany()
        sourceCursorRows = await db.query.sourceCursors.findMany()

        integrationAccountRows = integrationAccountRows.filter((account) =>
          integrationIds.includes(account.connectionId),
        )
        sourceCursorRows = sourceCursorRows.filter((cursor) =>
          integrationIds.includes(cursor.connectionId),
        )
      }

      return {
        integrationAccounts: integrationAccountRows,
        integrations,
        memberships,
        sourceCursors: sourceCursorRows,
        syncRuns: syncRunRows,
        workspace,
      }
    },
  }
}
