export type NodeEnv = "development" | "test" | "production"

export type AppRuntimeEnv = {
  appName: string
  appVersion: string
  autoRunMigrations: boolean
  betterAuthCookieDomain: string | null
  betterAuthSecret: string | null
  betterAuthUrl: string | null
  databaseUrl: string | null
  githubAppId: string | null
  githubAppPrivateKey: string | null
  githubAppSlug: string | null
  host: string
  nodeEnv: NodeEnv
  port: number
  trustedOrigins: string[]
}

export type AppBindings = {
  Variables: {
    authSession: {
      createdAt: Date | string
      expiresAt: Date | string
      id: string
      ipAddress?: string | null
      token: string
      updatedAt: Date | string
      userAgent?: string | null
      userId: string
    } | null
    authUser: {
      createdAt: Date | string
      email: string
      emailVerified: boolean
      id: string
      image?: string | null
      name: string
      updatedAt: Date | string
    } | null
    env: AppRuntimeEnv
    requestId: string
    requestStartedAt: number
  }
}
