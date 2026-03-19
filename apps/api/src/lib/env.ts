import type { AppRuntimeEnv, NodeEnv } from "../types.js"

const DEFAULT_PORT = 8787
const VALID_NODE_ENVS = new Set<NodeEnv>(["development", "test", "production"])

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

export function getRuntimeEnv(source: NodeJS.ProcessEnv = process.env): AppRuntimeEnv {
  return {
    appName: source.APP_NAME ?? "pulsenote-api",
    appVersion: source.APP_VERSION ?? "0.1.0",
    databaseUrl: source.DATABASE_URL ?? null,
    host: source.HOST ?? "127.0.0.1",
    nodeEnv: parseNodeEnv(source.NODE_ENV),
    port: parsePort(source.PORT),
  }
}
