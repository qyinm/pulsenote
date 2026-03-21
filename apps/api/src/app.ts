import { Hono, type Context } from "hono"

import { createAuthServiceForRuntime } from "./auth/service.js"
import { createDatabaseClient } from "./db/client.js"
import { createGitHubClient, type GitHubClient } from "./github/client.js"
import { createGitHubSyncService } from "./github/service.js"
import { createFoundationService, type FoundationService } from "./foundation/service.js"
import { createInMemoryFoundationStore } from "./foundation/store.js"
import { createPostgresFoundationStore } from "./foundation/postgres-store.js"
import { getRuntimeEnv } from "./lib/env.js"
import { requestContext } from "./middleware/request-context.js"
import { createInMemoryReleaseWorkflowStore } from "./release-workflow/in-memory-store.js"
import { createPostgresReleaseWorkflowStore } from "./release-workflow/postgres-store.js"
import { createReleaseWorkflowService, type ReleaseWorkflowService } from "./release-workflow/service.js"
import { foundationRoute } from "./routes/foundation.js"
import { healthRoute } from "./routes/health.js"
import { createReleaseWorkflowRoute } from "./routes/release-workflow.js"
import { sessionRoute } from "./routes/session.js"
import { createWorkspacesRoute } from "./routes/workspaces.js"
import type { AppBindings, AppRuntimeEnv } from "./types.js"

type CreateAppOptions = {
  authService?: ReturnType<typeof createAuthServiceForRuntime>
  foundationService?: FoundationService
  githubClient?: GitHubClient
  githubSyncService?: ReturnType<typeof createGitHubSyncService>
  releaseWorkflowService?: ReleaseWorkflowService
}

export function createApp(runtimeEnv: AppRuntimeEnv = getRuntimeEnv(), options: CreateAppOptions = {}) {
  if (options.githubSyncService && !options.foundationService) {
    throw new Error("foundationService is required when githubSyncService is injected")
  }

  const app = new Hono<AppBindings>()
  const authService = options.authService ?? createAuthServiceForRuntime(runtimeEnv)
  let foundationStore = options.foundationService?.store
  let releaseWorkflowStore = options.releaseWorkflowService?.store

  if (!foundationStore) {
    if (!runtimeEnv.databaseUrl) {
      foundationStore = createInMemoryFoundationStore()
    } else {
      const { db } = createDatabaseClient(runtimeEnv.databaseUrl)
      foundationStore = createPostgresFoundationStore(db)

      if (!releaseWorkflowStore) {
        releaseWorkflowStore = createPostgresReleaseWorkflowStore(db)
      }
    }
  }

  if (!releaseWorkflowStore) {
    if (!runtimeEnv.databaseUrl) {
      releaseWorkflowStore = createInMemoryReleaseWorkflowStore(foundationStore)
    } else {
      const { db } = createDatabaseClient(runtimeEnv.databaseUrl)
      releaseWorkflowStore = createPostgresReleaseWorkflowStore(db)
    }
  }

  const foundationService = options.foundationService ?? createFoundationService(foundationStore)
  const releaseWorkflowService =
    options.releaseWorkflowService ?? createReleaseWorkflowService(releaseWorkflowStore)
  const githubSyncService =
    options.githubSyncService ??
    createGitHubSyncService({
      githubClient: options.githubClient ?? createGitHubClient(),
      runtimeEnv,
      store: foundationStore,
    })

  const applyAuthCorsHeaders = (context: Context<AppBindings>) => {
    const origin = context.req.header("origin")

    if (!origin || !runtimeEnv.trustedOrigins.includes(origin)) {
      return false
    }

    context.header("Access-Control-Allow-Credentials", "true")
    context.header("Access-Control-Allow-Headers", "Content-Type")
    context.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
    context.header("Access-Control-Allow-Origin", origin)
    context.header("Vary", "Origin")
    return true
  }

  const appendAuthCorsHeaders = (
    context: Context<AppBindings>,
    response: Response,
  ) => {
    const origin = context.req.header("origin")

    if (!origin || !runtimeEnv.trustedOrigins.includes(origin)) {
      return response
    }

    const headers = new Headers(response.headers)
    headers.set("Access-Control-Allow-Credentials", "true")
    headers.set("Access-Control-Allow-Headers", "Content-Type")
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Vary", "Origin")

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  }

  app.use("*", requestContext(runtimeEnv))
  const trustedOriginCorsMiddleware = async (
    context: Context<AppBindings>,
    next: () => Promise<void>,
  ) => {
    const isTrustedOrigin = applyAuthCorsHeaders(context)

    if (context.req.method === "OPTIONS") {
      if (!isTrustedOrigin) {
        console.warn(
          JSON.stringify({
            event: "cors.preflight.rejected",
            origin: context.req.header("origin") ?? null,
            path: context.req.path,
            requestId: context.get("requestId"),
            service: runtimeEnv.appName,
            timestamp: new Date().toISOString(),
          }),
        )
        return context.json({ error: "Origin is not allowed" }, 403)
      }

      return context.body(null, 204)
    }

    await next()
  }
  app.use("/api/auth/*", trustedOriginCorsMiddleware)
  app.use("/v1/*", trustedOriginCorsMiddleware)
  app.use("*", async (context, next) => {
    let session = null

    try {
      session = await authService.getSession(context.req.raw.headers)
    } catch (error) {
      console.warn(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          event: "auth.session.lookup_failed",
          path: context.req.path,
          requestId: context.get("requestId"),
          service: runtimeEnv.appName,
          timestamp: new Date().toISOString(),
        }),
      )
    }

    context.set("authSession", session?.session ?? null)
    context.set("authUser", session?.user ?? null)

    await next()
  })

  app.get("/", (context) => {
    const env = context.get("env")

    return context.json({
      message: "PulseNote API foundation is running.",
      nextFocus: [
        "workspace and integration persistence",
        "GitHub ingest",
        "release record normalization",
      ],
      requestId: context.get("requestId"),
      service: env.appName,
      version: env.appVersion,
    })
  })

  app.on(["GET", "POST"], "/api/auth/*", async (context) => {
    const response = await authService.handler(context.req.raw)
    return appendAuthCorsHeaders(context, response)
  })
  app.route("/health", healthRoute)
  app.route("/v1/foundation", foundationRoute)
  app.route("/v1/session", sessionRoute)
  app.route(
    "/v1/workspaces",
    createWorkspacesRoute(foundationService, githubSyncService, releaseWorkflowService),
  )

  app.onError((error, context) => {
    const requestId = context.get("requestId")

    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: context.req.path,
        requestId,
        service: runtimeEnv.appName,
        timestamp: new Date().toISOString(),
      }),
    )

    return context.json(
      {
        error: "Internal server error",
        requestId,
      },
      500,
    )
  })

  return app
}

export const app = createApp()
