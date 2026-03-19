import { Hono } from "hono"

import { createAuthServiceForRuntime } from "./auth/service.js"
import { createFoundationService } from "./foundation/service.js"
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
  foundationService?: ReturnType<typeof createFoundationService>
}

export function createApp(runtimeEnv: AppRuntimeEnv = getRuntimeEnv(), options: CreateAppOptions = {}) {
  const app = new Hono<AppBindings>()
  const authService = options.authService ?? createAuthServiceForRuntime(runtimeEnv)
  const foundationService =
    options.foundationService ?? createFoundationService(createFoundationStoreForRuntime(runtimeEnv))

  app.use("*", requestContext(runtimeEnv))
  app.use("*", async (context, next) => {
    const session = await authService.getSession(context.req.raw.headers)

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
  app.route("/v1/workspaces", createWorkspacesRoute(foundationService))

  app.onError((error, context) => {
    const requestId = context.get("requestId")

    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
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
