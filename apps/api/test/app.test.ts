import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  betterAuthSecret: null,
  betterAuthUrl: null,
  databaseUrl: null,
  host: "127.0.0.1",
  nodeEnv: "test" as const,
  port: 9999,
  trustedOrigins: [],
}

function createAuthService(): AuthService {
  return {
    async getSession() {
      return null
    },
    async handler() {
      return Response.json({ ok: true })
    },
    isConfigured: true,
  }
}

test("createApp logs stack traces for unhandled errors", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(),
    foundationService,
  })

  app.get("/boom", () => {
    throw new Error("boom")
  })

  const logged: string[] = []
  const originalConsoleError = console.error
  console.error = (message?: unknown) => {
    logged.push(String(message))
  }

  try {
    const response = await app.request("/boom")
    const body = await response.json()

    assert.equal(response.status, 500)
    assert.equal(body.error, "Internal server error")
    assert.match(body.requestId, /.+/)
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(logged.length, 1)

  const payload = JSON.parse(logged[0] ?? "{}")
  assert.equal(payload.error, "boom")
  assert.equal(payload.path, "/boom")
  assert.equal(payload.service, runtimeEnv.appName)
  assert.match(payload.requestId, /.+/)
  assert.match(payload.stack, /Error: boom/)
})

test("createApp rejects github sync injection without a matching foundation service", () => {
  assert.throws(
    () =>
      createApp(runtimeEnv, {
        authService: createAuthService(),
        githubSyncService: {} as never,
      }),
    /foundationService is required when githubSyncService is injected/,
  )
})
