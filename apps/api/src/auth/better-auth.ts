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

export const betterAuthSchemaFieldMappings = {
  account: {
    accessToken: "accessToken",
    accessTokenExpiresAt: "accessTokenExpiresAt",
    accountId: "accountId",
    createdAt: "createdAt",
    idToken: "idToken",
    providerId: "providerId",
    refreshToken: "refreshToken",
    refreshTokenExpiresAt: "refreshTokenExpiresAt",
    updatedAt: "updatedAt",
    userId: "userId",
  },
  session: {
    createdAt: "createdAt",
    expiresAt: "expiresAt",
    ipAddress: "ipAddress",
    updatedAt: "updatedAt",
    userAgent: "userAgent",
    userId: "userId",
  },
  user: {
    createdAt: "createdAt",
    emailVerified: "emailVerified",
    name: "fullName",
    updatedAt: "updatedAt",
  },
  verification: {
    createdAt: "createdAt",
    expiresAt: "expiresAt",
    updatedAt: "updatedAt",
  },
} as const

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
      ...(runtimeEnv.betterAuthCookieDomain
        ? {
            crossSubDomainCookies: {
              domain: runtimeEnv.betterAuthCookieDomain,
              enabled: true,
            },
          }
        : {}),
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
      fields: betterAuthSchemaFieldMappings.session,
      storeSessionInDatabase: true,
    },
    trustedOrigins: runtimeEnv.trustedOrigins,
    user: {
      fields: betterAuthSchemaFieldMappings.user,
    },
    account: {
      fields: betterAuthSchemaFieldMappings.account,
    },
    verification: {
      fields: betterAuthSchemaFieldMappings.verification,
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
