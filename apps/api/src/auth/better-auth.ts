import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"

import * as schema from "../db/schema.js"
import type { DatabaseClient } from "../db/client.js"
import type { AppRuntimeEnv } from "../types.js"
import type { AuthService } from "./service.js"

type CreateBetterAuthServiceOptions = {
  db: DatabaseClient
  runtimeEnv: AppRuntimeEnv
}

function resolveBaseUrl(runtimeEnv: AppRuntimeEnv) {
  if (runtimeEnv.betterAuthUrl) {
    return runtimeEnv.betterAuthUrl
  }

  if (runtimeEnv.nodeEnv === "production") {
    throw new Error("BETTER_AUTH_URL is required in production")
  }

  return `http://${runtimeEnv.host}:${runtimeEnv.port}`
}

function resolveSecret(runtimeEnv: AppRuntimeEnv) {
  if (runtimeEnv.betterAuthSecret) {
    return runtimeEnv.betterAuthSecret
  }

  if (runtimeEnv.nodeEnv === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production")
  }

  return "pulsenote-development-secret-change-before-production"
}

export function createBetterAuthService({
  db,
  runtimeEnv,
}: CreateBetterAuthServiceOptions): AuthService {
  const auth = betterAuth({
    advanced: {
      database: {
        generateId: false,
      },
      useSecureCookies: runtimeEnv.nodeEnv === "production",
    },
    appName: runtimeEnv.appName,
    baseURL: resolveBaseUrl(runtimeEnv),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        account: schema.accounts,
        session: schema.sessions,
        user: schema.users,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: resolveSecret(runtimeEnv),
    session: {
      fields: {
        createdAt: "created_at",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        updatedAt: "updated_at",
        userAgent: "user_agent",
        userId: "user_id",
      },
      storeSessionInDatabase: true,
    },
    trustedOrigins: runtimeEnv.trustedOrigins,
    user: {
      fields: {
        createdAt: "created_at",
        emailVerified: "email_verified",
        name: "full_name",
        updatedAt: "updated_at",
      },
    },
    account: {
      fields: {
        accessToken: "access_token",
        accessTokenExpiresAt: "access_token_expires_at",
        accountId: "account_id",
        createdAt: "created_at",
        idToken: "id_token",
        providerId: "provider_id",
        refreshToken: "refresh_token",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        updatedAt: "updated_at",
        userId: "user_id",
      },
    },
    verification: {
      fields: {
        createdAt: "created_at",
        expiresAt: "expires_at",
        updatedAt: "updated_at",
      },
    },
  })

  return {
    async getSession(headers) {
      const session = await auth.api.getSession({
        headers,
      })

      return session
    },
    async handler(request) {
      return auth.handler(request)
    },
    isConfigured: true,
  }
}
