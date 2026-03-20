import assert from "node:assert/strict"
import test from "node:test"

import { ApiError } from "../lib/api/client.js"

process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.pulsenotes.xyz"

async function loadAuthSessionModules() {
  return Promise.all([import("../lib/auth/client.js"), import("../lib/auth/session.js")]).then(
    ([authClientModule, authSessionModule]) => ({
      createPulseNoteAuthClient: authClientModule.createPulseNoteAuthClient,
      getServerSession: authSessionModule.getServerSession,
    }),
  )
}

test("createPulseNoteAuthClient points Better Auth at the API origin", async () => {
  const { createPulseNoteAuthClient } = await loadAuthSessionModules()
  let receivedOptions: unknown

  const client = createPulseNoteAuthClient(
    (options) => {
      receivedOptions = options
      return { kind: "auth-client" } as never
    },
    {
      NEXT_PUBLIC_API_BASE_URL: "https://api.pulsenotes.xyz",
    },
  )

  assert.deepEqual(receivedOptions, {
    baseURL: "https://api.pulsenotes.xyz",
    fetchOptions: {
      credentials: "include",
    },
  })
  assert.deepEqual(client, { kind: "auth-client" })
})

test("getServerSession forwards the incoming cookie header", async () => {
  const { getServerSession } = await loadAuthSessionModules()
  let receivedInit: RequestInit | undefined

  const session = await getServerSession(
    new Headers({
      cookie: "better-auth.session=abc123",
    }),
    {
      async getSession(init) {
        receivedInit = init

        return {
          session: {
            createdAt: "2026-03-20T00:00:00.000Z",
            expiresAt: "2026-03-21T00:00:00.000Z",
            id: "session_1",
            updatedAt: "2026-03-20T00:00:00.000Z",
            userId: "user_1",
          },
          user: {
            createdAt: "2026-03-20T00:00:00.000Z",
            email: "owner@pulsenote.dev",
            emailVerified: true,
            id: "user_1",
            name: "Owner User",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
        }
      },
    },
  )

  assert.equal(
    ((receivedInit?.headers as Record<string, string> | undefined) ?? {}).cookie,
    "better-auth.session=abc123",
  )
  assert.equal(session?.user.id, "user_1")
})

test("getServerSession degrades unauthorized responses to null", async () => {
  const { getServerSession } = await loadAuthSessionModules()
  const session = await getServerSession(new Headers(), {
    async getSession() {
      throw new ApiError("Authentication is required", 401, {
        message: "Authentication is required",
        status: 401,
      })
    },
  })

  assert.equal(session, null)
})
