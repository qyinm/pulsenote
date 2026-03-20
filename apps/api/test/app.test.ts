import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"

const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  betterAuthCookieDomain: null,
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

test("createApp degrades to anonymous access when session lookup fails", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const logged: string[] = []
  const originalConsoleWarn = console.warn
  console.warn = (message?: unknown) => {
    logged.push(String(message))
  }

  const app = createApp(runtimeEnv, {
    authService: {
      async getSession() {
        throw new Error("session store unavailable")
      },
      async handler() {
        return Response.json({ ok: true })
      },
      isConfigured: true,
    },
    foundationService,
  })

  try {
    const [healthResponse, authResponse, sessionResponse] = await Promise.all([
      app.request("/health"),
      app.request("/api/auth/ok"),
      app.request("/v1/session"),
    ])

    assert.equal(healthResponse.status, 200)
    assert.equal(authResponse.status, 200)
    assert.equal(sessionResponse.status, 401)
  } finally {
    console.warn = originalConsoleWarn
  }

  assert.equal(logged.length, 3)

  for (const entry of logged) {
    const payload = JSON.parse(entry)
    assert.equal(payload.error, "session store unavailable")
    assert.equal(payload.event, "auth.session.lookup_failed")
    assert.equal(payload.service, runtimeEnv.appName)
    assert.match(payload.requestId, /.+/)
  }
})
