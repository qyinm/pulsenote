import { Hono, type Context } from "hono"

import { createAuthServiceForRuntime } from "./auth/service.js"
import { createGitHubClient, type GitHubClient } from "./github/client.js"
import { createGitHubSyncService } from "./github/service.js"
import { createFoundationService, type FoundationService } from "./foundation/service.js"
import { createFoundationStoreForRuntime } from "./foundation/resolve-store.js"
import { getRuntimeEnv } from "./lib/env.js"
import { requestContext } from "./middleware/request-context.js"
import { foundationRoute } from "./routes/foundation.js"
import { healthRoute } from "./routes/health.js"
import { sessionRoute } from "./routes/session.js"
import { createWorkspacesRoute } from "./routes/workspaces.js"
import type { AppBindings, AppRuntimeEnv } from "./types.js"

type CreateAppOptions = {
  authService?: ReturnType<typeof createAuthServiceForRuntime>
  foundationService?: FoundationService
  githubClient?: GitHubClient
  githubSyncService?: ReturnType<typeof createGitHubSyncService>
}

export function createApp(runtimeEnv: AppRuntimeEnv = getRuntimeEnv(), options: CreateAppOptions = {}) {
  if (options.githubSyncService && !options.foundationService) {
    throw new Error("foundationService is required when githubSyncService is injected")
  }

  const app = new Hono<AppBindings>()
  const authService = options.authService ?? createAuthServiceForRuntime(runtimeEnv)
  const foundationStore = options.foundationService?.store ?? createFoundationStoreForRuntime(runtimeEnv)
  const foundationService = options.foundationService ?? createFoundationService(foundationStore)
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

  app.on(["GET", "POST"], "/api/auth/*", (context) => authService.handler(context.req.raw))
  app.route("/health", healthRoute)
  app.route("/v1/foundation", foundationRoute)
  app.route("/v1/session", sessionRoute)
  app.route("/v1/workspaces", createWorkspacesRoute(foundationService, githubSyncService))

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
