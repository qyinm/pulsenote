import assert from "node:assert/strict"
import test from "node:test"

import { createApp } from "../src/app.js"
import type { AuthService, AuthSession } from "../src/auth/service.js"
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

function createAuthService(session: AuthSession): AuthService {
  return {
    async getSession() {
      return session
    },
    async handler(request) {
      return Response.json({
        ok: true,
        path: new URL(request.url).pathname,
      })
    },
    isConfigured: true,
  }
}

test("auth routes mount the Better Auth handler", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const response = await app.request("/api/auth/ok")

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    ok: true,
    path: "/api/auth/ok",
  })
})

test("auth routes allow trusted-origin preflight requests with credentials", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(
    {
      ...runtimeEnv,
      trustedOrigins: ["http://localhost:3000"],
    },
    {
      authService: createAuthService(null),
      foundationService,
    },
  )

  const response = await app.request("/api/auth/ok", {
    headers: {
      "access-control-request-method": "POST",
      origin: "http://localhost:3000",
    },
    method: "OPTIONS",
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000")
  assert.equal(response.headers.get("access-control-allow-credentials"), "true")
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, PUT, OPTIONS")
})

test("auth routes include CORS headers on trusted-origin handler responses", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(
    {
      ...runtimeEnv,
      trustedOrigins: ["https://app.pulsenotes.xyz"],
    },
    {
      authService: {
        ...createAuthService(null),
        async handler() {
          return Response.json(
            {
              code: "EMAIL_ALREADY_EXISTS",
              message: "Email already exists",
            },
            { status: 400 },
          )
        },
      },
      foundationService,
    },
  )

  const response = await app.request("/api/auth/sign-up/email", {
    headers: {
      origin: "https://app.pulsenotes.xyz",
    },
    method: "POST",
  })

  assert.equal(response.status, 400)
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.pulsenotes.xyz")
  assert.equal(response.headers.get("access-control-allow-credentials"), "true")
  assert.equal(response.headers.get("vary"), "Origin")
  assert.deepEqual(await response.json(), {
    code: "EMAIL_ALREADY_EXISTS",
    message: "Email already exists",
  })
})

test("auth routes reject untrusted-origin preflight requests", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(
    {
      ...runtimeEnv,
      trustedOrigins: ["http://localhost:3000"],
    },
    {
      authService: createAuthService(null),
      foundationService,
    },
  )

  const response = await app.request("/api/auth/ok", {
    headers: {
      "access-control-request-method": "POST",
      origin: "http://127.0.0.1:3000",
    },
    method: "OPTIONS",
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    error: "Origin is not allowed",
  })
})

test("session route returns the authenticated session", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService({
      session: {
        createdAt: "2026-03-20T00:00:00.000Z",
        expiresAt: "2026-03-27T00:00:00.000Z",
        id: "session_1",
        token: "token_1",
        updatedAt: "2026-03-20T00:00:00.000Z",
        userId: "user_1",
      },
      user: {
        createdAt: "2026-03-20T00:00:00.000Z",
        email: "owner@pulsenote.dev",
        emailVerified: false,
        id: "user_1",
        image: null,
        name: "Owner User",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    }),
    foundationService,
  })

  const response = await app.request("/v1/session")

  assert.equal(response.status, 200)

  const body = await response.json()
  assert.equal(body.user.email, "owner@pulsenote.dev")
  assert.equal(body.session.userId, "user_1")
  assert.equal(body.session.id, "session_1")
  assert.equal(body.session.expiresAt, "2026-03-27T00:00:00.000Z")
  assert.equal("token" in body.session, false)
  assert.equal("ipAddress" in body.session, false)
  assert.equal("userAgent" in body.session, false)
})

test("session route rejects anonymous requests", async () => {
  const foundationService = createFoundationService(createInMemoryFoundationStore())
  const app = createApp(runtimeEnv, {
    authService: createAuthService(null),
    foundationService,
  })

  const response = await app.request("/v1/session")

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    message: "Authentication is required",
    status: 401,
  })
})
