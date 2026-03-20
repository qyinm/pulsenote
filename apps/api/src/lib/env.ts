import type { AppRuntimeEnv, NodeEnv } from "../types.js"

const DEFAULT_PORT = 8787
const DEFAULT_LOCAL_HOST = "127.0.0.1"
const DEFAULT_PUBLIC_HOST = "0.0.0.0"
const VALID_NODE_ENVS = new Set<NodeEnv>(["development", "test", "production"])
const DEFAULT_TRUSTED_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"]

function parseNodeEnv(rawValue: string | undefined): NodeEnv {
  if (rawValue && VALID_NODE_ENVS.has(rawValue as NodeEnv)) {
    return rawValue as NodeEnv
  }

  return "development"
}

function parsePort(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_PORT
  }

  const parsedValue = Number.parseInt(rawValue, 10)

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return DEFAULT_PORT
  }

  return parsedValue
}

function parseAutoRunMigrations(rawValue: string | undefined, nodeEnv: NodeEnv) {
  if (!rawValue) {
    return nodeEnv === "production"
  }

  return rawValue === "1" || rawValue.toLowerCase() === "true"
}

export function getRuntimeEnv(source: NodeJS.ProcessEnv = process.env): AppRuntimeEnv {
  const nodeEnv = parseNodeEnv(source.NODE_ENV)
  const trustedOrigins = source.TRUSTED_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    appName: source.APP_NAME ?? "pulsenote-api",
    appVersion: source.APP_VERSION ?? "0.1.0",
    autoRunMigrations: parseAutoRunMigrations(source.AUTO_RUN_MIGRATIONS, nodeEnv),
    betterAuthCookieDomain: source.BETTER_AUTH_COOKIE_DOMAIN?.trim() || null,
    betterAuthSecret: source.BETTER_AUTH_SECRET ?? null,
    betterAuthUrl: source.BETTER_AUTH_URL ?? null,
    databaseUrl: source.DATABASE_URL ?? null,
    host: source.HOST ?? (nodeEnv === "production" ? DEFAULT_PUBLIC_HOST : DEFAULT_LOCAL_HOST),
    nodeEnv,
    port: parsePort(source.PORT),
    trustedOrigins:
      trustedOrigins && trustedOrigins.length > 0 ? trustedOrigins : DEFAULT_TRUSTED_ORIGINS,
  }
}
