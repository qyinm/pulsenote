import {
  claimStatuses,
  evidenceStates,
  evidenceSourceTypes,
  integrationConnectionStatuses,
  integrationProviders,
  reviewStates,
  reviewStages,
  workflowEventTypes,
  syncRunStatuses,
  workspaceMembershipRoles,
} from "../domain/models.js"

import {
  foreignKey,
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const integrationProviderEnum = pgEnum("integration_provider", integrationProviders)
export const workspaceMembershipRoleEnum = pgEnum(
  "workspace_membership_role",
  workspaceMembershipRoles,
)
export const integrationConnectionStatusEnum = pgEnum(
  "integration_connection_status",
  integrationConnectionStatuses,
)
export const syncRunStatusEnum = pgEnum("sync_run_status", syncRunStatuses)
export const reviewStageEnum = pgEnum("review_stage", reviewStages)
export const evidenceStateEnum = pgEnum("evidence_state", evidenceStates)
export const claimStatusEnum = pgEnum("claim_status", claimStatuses)
export const evidenceSourceTypeEnum = pgEnum("evidence_source_type", evidenceSourceTypes)
export const reviewStateEnum = pgEnum("review_state", reviewStates)
export const workflowEventTypeEnum = pgEnum("workflow_event_type", workflowEventTypes)

export const users = pgTable("users", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  fullName: text("full_name"),
  id: uuid("id").defaultRandom().primaryKey(),
  image: text("image"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
})

export const sessions = pgTable("sessions", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  ipAddress: text("ip_address"),
  token: text("token").notNull().unique(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const accounts = pgTable("accounts", {
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    mode: "string",
    withTimezone: true,
  }),
  accountId: text("account_id").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  idToken: text("id_token"),
  password: text("password"),
  providerId: text("provider_id").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    mode: "string",
    withTimezone: true,
  }),
  scope: text("scope"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const verifications = pgTable("verifications", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  value: text("value").notNull(),
})

export const workspaces = pgTable("workspaces", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
})

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    role: workspaceMembershipRoleEnum("role").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("workspace_memberships_workspace_id_user_id_unique").on(table.workspaceId, table.userId),
  ],
)

export const currentWorkspaceSelections = pgTable(
  "current_workspace_selections",
  {
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.userId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
      name: "current_workspace_selections_workspace_id_user_id_workspace_memberships_fk",
    }).onDelete("cascade"),
  ],
)

export const integrationConnections = pgTable(
  "integration_connections",
  {
    connectedAt: timestamp("connected_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    externalAccountId: varchar("external_account_id", { length: 255 }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastSyncedAt: timestamp("last_synced_at", { mode: "string", withTimezone: true }),
    provider: integrationProviderEnum("provider").notNull(),
    status: integrationConnectionStatusEnum("status").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [unique("integration_connections_id_workspace_id_unique").on(table.id, table.workspaceId)],
)

export const integrationAccounts = pgTable("integration_accounts", {
  accountLabel: varchar("account_label", { length: 255 }).notNull(),
  accountUrl: text("account_url"),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => integrationConnections.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  provider: integrationProviderEnum("provider").notNull(),
})

export const syncRuns = pgTable(
  "sync_runs",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    errorMessage: text("error_message"),
    finishedAt: timestamp("finished_at", { mode: "string", withTimezone: true }),
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider").notNull(),
    scope: text("scope").notNull(),
    startedAt: timestamp("started_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    status: syncRunStatusEnum("status").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId, table.workspaceId],
      foreignColumns: [integrationConnections.id, integrationConnections.workspaceId],
      name: "sync_runs_connection_id_workspace_id_integration_connections_fk",
    }).onDelete("cascade"),
  ],
)

export const sourceCursors = pgTable(
  "source_cursors",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    value: text("value").notNull(),
  },
  (table) => [unique("source_cursors_connection_id_key_unique").on(table.connectionId, table.key)],
)

export const releaseRecords = pgTable(
  "release_records",
  {
    compareRange: text("compare_range"),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    stage: reviewStageEnum("stage").notNull(),
    summary: text("summary"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId, table.workspaceId],
      foreignColumns: [integrationConnections.id, integrationConnections.workspaceId],
      name: "release_records_connection_id_workspace_id_integration_connections_fk",
    }).onDelete("cascade"),
  ],
)

export const evidenceBlocks = pgTable("evidence_blocks", {
  body: text("body"),
  capturedAt: timestamp("captured_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  evidenceState: evidenceStateEnum("evidence_state").notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  provider: integrationProviderEnum("provider").notNull(),
  releaseRecordId: uuid("release_record_id")
    .notNull()
    .references(() => releaseRecords.id, { onDelete: "cascade" }),
  sourceRef: text("source_ref").notNull(),
  sourceType: evidenceSourceTypeEnum("source_type").notNull(),
  title: text("title").notNull(),
})

export const claimCandidates = pgTable("claim_candidates", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  releaseRecordId: uuid("release_record_id")
    .notNull()
    .references(() => releaseRecords.id, { onDelete: "cascade" }),
  sentence: text("sentence").notNull(),
  status: claimStatusEnum("status").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
})

export const claimCandidateEvidenceBlocks = pgTable(
  "claim_candidate_evidence_blocks",
  {
    claimCandidateId: uuid("claim_candidate_id")
      .notNull()
      .references(() => claimCandidates.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    evidenceBlockId: uuid("evidence_block_id")
      .notNull()
      .references(() => evidenceBlocks.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.claimCandidateId, table.evidenceBlockId] })],
)

export const sourceLinks = pgTable("source_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  releaseRecordId: uuid("release_record_id")
    .notNull()
    .references(() => releaseRecords.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
})

export const reviewStatuses = pgTable(
  "review_statuses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    note: text("note"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    releaseRecordId: uuid("release_record_id")
      .notNull()
      .references(() => releaseRecords.id, { onDelete: "cascade" }),
    stage: reviewStageEnum("stage").notNull(),
    state: reviewStateEnum("state").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("review_statuses_release_record_id_stage_unique").on(table.releaseRecordId, table.stage),
  ],
)

export const draftRevisions = pgTable(
  "draft_revisions",
  {
    changelogBody: text("changelog_body").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    id: uuid("id").defaultRandom().primaryKey(),
    releaseNotesBody: text("release_notes_body").notNull(),
    releaseRecordId: uuid("release_record_id")
      .notNull()
      .references(() => releaseRecords.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
  },
  (table) => [
    unique("draft_revisions_release_record_id_version_unique").on(table.releaseRecordId, table.version),
    unique("draft_revisions_id_release_record_id_unique").on(table.id, table.releaseRecordId),
  ],
)

export const draftClaimCheckResults = pgTable(
  "draft_claim_check_results",
  {
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    draftRevisionId: uuid("draft_revision_id")
      .notNull()
      .references(() => draftRevisions.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    note: text("note"),
    releaseRecordId: uuid("release_record_id")
      .notNull()
      .references(() => releaseRecords.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    status: claimStatusEnum("status").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.draftRevisionId, table.releaseRecordId],
      foreignColumns: [draftRevisions.id, draftRevisions.releaseRecordId],
      name: "draft_claim_check_results_draft_revision_id_release_record_id_draft_revisions_fk",
    }),
  ],
)

export const draftClaimCheckResultEvidenceBlocks = pgTable(
  "draft_claim_check_result_evidence_blocks",
  {
    draftClaimCheckResultId: uuid("draft_claim_check_result_id")
      .notNull()
      .references(() => draftClaimCheckResults.id, { onDelete: "cascade" }),
    evidenceBlockId: uuid("evidence_block_id")
      .notNull()
      .references(() => evidenceBlocks.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.draftClaimCheckResultId, table.evidenceBlockId] })],
)

export const workflowEvents = pgTable(
  "workflow_events",
  {
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    draftRevisionId: uuid("draft_revision_id").references(() => draftRevisions.id, { onDelete: "set null" }),
    id: uuid("id").defaultRandom().primaryKey(),
    note: text("note"),
    releaseRecordId: uuid("release_record_id")
      .notNull()
      .references(() => releaseRecords.id, { onDelete: "cascade" }),
    stage: reviewStageEnum("stage").notNull(),
    type: workflowEventTypeEnum("type").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.draftRevisionId, table.releaseRecordId],
      foreignColumns: [draftRevisions.id, draftRevisions.releaseRecordId],
      name: "workflow_events_draft_revision_id_release_record_id_draft_revisions_fk",
    }),
  ],
)

export const publishPackExports = pgTable(
  "publish_pack_exports",
  {
    changelogBody: text("changelog_body").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    draftRevisionId: uuid("draft_revision_id")
      .notNull()
      .references(() => draftRevisions.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    releaseNotesBody: text("release_notes_body").notNull(),
    releaseRecordId: uuid("release_record_id")
      .notNull()
      .references(() => releaseRecords.id, { onDelete: "cascade" }),
  },
  (table) => [
    foreignKey({
      columns: [table.draftRevisionId, table.releaseRecordId],
      foreignColumns: [draftRevisions.id, draftRevisions.releaseRecordId],
      name: "publish_pack_exports_draft_revision_id_release_record_id_draft_revisions_fk",
    }),
  ],
)
