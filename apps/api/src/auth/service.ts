import type { AppRuntimeEnv } from "../types.js"

import { createDatabaseClient } from "../db/client.js"
import { createBetterAuthService } from "./better-auth.js"

export type AuthUser = {
  createdAt: Date | string
  email: string
  emailVerified: boolean
  id: string
  image?: string | null
  name: string
  updatedAt: Date | string
}

export type AuthSessionRecord = {
  createdAt: Date | string
  expiresAt: Date | string
  id: string
  ipAddress?: string | null
  token: string
  updatedAt: Date | string
  userAgent?: string | null
  userId: string
}

export type AuthSession = {
  session: AuthSessionRecord
  user: AuthUser
} | null

export type AuthService = {
  getSession(headers: Headers): Promise<AuthSession>
  handler(request: Request): Promise<Response>
  isConfigured: boolean
}

type CreateAuthServiceDependencies = {
  createDatabaseClient?: typeof createDatabaseClient
}

function createDisabledAuthService(message: string): AuthService {
  return {
    async getSession() {
      return null
    },
    async handler() {
      return Response.json(
        {
          message,
          status: 503,
        },
        { status: 503 },
      )
    },
    isConfigured: false,
  }
}

export function createAuthServiceForRuntime(
  runtimeEnv: AppRuntimeEnv,
  dependencies: CreateAuthServiceDependencies = {},
): AuthService {
  if (!runtimeEnv.databaseUrl) {
    if (runtimeEnv.nodeEnv === "production") {
      throw new Error("DATABASE_URL is required to enable Better Auth in production")
    }

    return createDisabledAuthService("Authentication is not configured")
  }

  const databaseClientFactory = dependencies.createDatabaseClient ?? createDatabaseClient
  const databaseClient = databaseClientFactory(runtimeEnv.databaseUrl)

  return createBetterAuthService({
    db: databaseClient.db,
    runtimeEnv,
  })
}
