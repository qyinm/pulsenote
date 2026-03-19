export type NodeEnv = "development" | "test" | "production"

export type AppRuntimeEnv = {
  appName: string
  appVersion: string
  databaseUrl: string | null
  host: string
  nodeEnv: NodeEnv
  port: number
}

export type AppBindings = {
  Variables: {
    env: AppRuntimeEnv
    requestId: string
    requestStartedAt: number
  }
}
