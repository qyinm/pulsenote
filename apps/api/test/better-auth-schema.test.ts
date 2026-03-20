import assert from "node:assert/strict"
import test from "node:test"

import * as schema from "../src/db/schema.js"
import { betterAuthSchemaFieldMappings } from "../src/auth/better-auth.js"

test("better auth field mappings reference drizzle schema property keys", () => {
  assert.ok(betterAuthSchemaFieldMappings.user.name in schema.users)
  assert.ok(betterAuthSchemaFieldMappings.user.createdAt in schema.users)
  assert.ok(betterAuthSchemaFieldMappings.user.emailVerified in schema.users)
  assert.ok(betterAuthSchemaFieldMappings.user.updatedAt in schema.users)

  assert.ok(betterAuthSchemaFieldMappings.session.createdAt in schema.sessions)
  assert.ok(betterAuthSchemaFieldMappings.session.expiresAt in schema.sessions)
  assert.ok(betterAuthSchemaFieldMappings.session.ipAddress in schema.sessions)
  assert.ok(betterAuthSchemaFieldMappings.session.updatedAt in schema.sessions)
  assert.ok(betterAuthSchemaFieldMappings.session.userAgent in schema.sessions)
  assert.ok(betterAuthSchemaFieldMappings.session.userId in schema.sessions)

  assert.ok(betterAuthSchemaFieldMappings.account.accessToken in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.accessTokenExpiresAt in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.accountId in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.createdAt in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.idToken in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.providerId in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.refreshToken in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.refreshTokenExpiresAt in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.updatedAt in schema.accounts)
  assert.ok(betterAuthSchemaFieldMappings.account.userId in schema.accounts)

  assert.ok(betterAuthSchemaFieldMappings.verification.createdAt in schema.verifications)
  assert.ok(betterAuthSchemaFieldMappings.verification.expiresAt in schema.verifications)
  assert.ok(betterAuthSchemaFieldMappings.verification.updatedAt in schema.verifications)
})
