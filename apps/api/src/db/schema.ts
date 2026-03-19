import {
  evidenceStates,
  integrationConnectionStatuses,
  integrationProviders,
  reviewStages,
  syncRunStatuses,
  workspaceMembershipRoles,
} from "../domain/models.js"

import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

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

export const workspaceMemberships = pgTable("workspace_memberships", {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  role: workspaceMembershipRoleEnum("role").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
})

export const integrationConnections = pgTable("integration_connections", {
  connectedAt: timestamp("connected_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  externalAccountId: varchar("external_account_id", { length: 255 }).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "string", withTimezone: true }),
  provider: integrationProviderEnum("provider").notNull(),
  status: integrationConnectionStatusEnum("status").notNull(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
})

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

export const syncRuns = pgTable("sync_runs", {
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
})

export const sourceCursors = pgTable("source_cursors", {
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => integrationConnections.id, { onDelete: "cascade" }),
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  value: text("value").notNull(),
})
