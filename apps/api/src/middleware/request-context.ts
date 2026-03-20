import type { MiddlewareHandler } from "hono"

import type { AppBindings, AppRuntimeEnv } from "../types.js"

export function requestContext(runtimeEnv: AppRuntimeEnv): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    const requestId = context.req.header("x-request-id") ?? crypto.randomUUID()
    const requestStartedAt = Date.now()

    context.set("env", runtimeEnv)
    context.set("requestId", requestId)
    context.set("requestStartedAt", requestStartedAt)
    context.header("x-request-id", requestId)

    await next()

    const durationMs = Date.now() - requestStartedAt
    const logEntry = {
      durationMs,
      method: context.req.method,
      path: context.req.path,
      requestId,
      service: runtimeEnv.appName,
      status: context.res.status,
      timestamp: new Date().toISOString(),
    }

    console.info(JSON.stringify(logEntry))
  }
}
