import { Hono } from "hono"

import type { AppBindings } from "../types.js"

export const healthRoute = new Hono<AppBindings>()

healthRoute.get("/", (context) => {
  const env = context.get("env")

  return context.json({
    environment: env.nodeEnv,
    requestId: context.get("requestId"),
    service: env.appName,
    status: "ok",
    timestamp: new Date().toISOString(),
    version: env.appVersion,
  })
})
