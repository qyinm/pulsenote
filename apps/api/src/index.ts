import { serve } from "@hono/node-server"

import { createApp } from "./app.js"
import { getRuntimeEnv } from "./lib/env.js"

const runtimeEnv = getRuntimeEnv()
const app = createApp(runtimeEnv)

serve(
  {
    fetch: app.fetch,
    hostname: runtimeEnv.host,
    port: runtimeEnv.port,
  },
  (info) => {
    console.info(
      JSON.stringify({
        event: "server.started",
        host: info.address,
        port: info.port,
        service: runtimeEnv.appName,
        timestamp: new Date().toISOString(),
      }),
    )
  },
)
