import assert from "node:assert/strict"
import test from "node:test"

import { ApiError, createApiClient, getApiBaseUrl } from "../lib/api/client.js"

test("getApiBaseUrl prefers NEXT_PUBLIC_API_BASE_URL when configured", () => {
  assert.equal(
    getApiBaseUrl({
      NEXT_PUBLIC_API_BASE_URL: "https://api.pulsenote.dev",
    }),
    "https://api.pulsenote.dev",
  )
})

test("getApiBaseUrl falls back to the local API origin for development", () => {
  assert.equal(getApiBaseUrl({}), "http://localhost:8787")
})

test("api client sends credentialed requests to session, workspace, and release record routes", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const client = createApiClient({
    baseUrl: "http://127.0.0.1:8787",
    fetch: async (input, init) => {
      requests.push({ init, input })
      return Response.json({ ok: true })
    },
  })

  await client.getSession()
  await client.getCurrentWorkspace()
  await client.listReleaseRecords("workspace 1")
  await client.getReleaseRecord("workspace 1", "release/2")

  assert.deepEqual(
    requests.map((request) => String(request.input)),
    [
      "http://127.0.0.1:8787/v1/session",
      "http://127.0.0.1:8787/v1/workspaces/current",
      "http://127.0.0.1:8787/v1/workspaces/workspace%201/release-records",
      "http://127.0.0.1:8787/v1/workspaces/workspace%201/release-records/release%2F2",
    ],
  )

  for (const request of requests) {
    assert.equal(request.init?.credentials, "include")
    assert.equal(new Headers(request.init?.headers).has("content-type"), false)
  }
})

test("api client throws a structured ApiError for non-ok responses", async () => {
  const client = createApiClient({
    baseUrl: "http://127.0.0.1:8787",
    fetch: async () =>
      Response.json(
        {
          message: "Authentication is required",
          status: 401,
        },
        { status: 401 },
      ),
  })

  await assert.rejects(
    () => client.getSession(),
    (error: unknown) =>
      error instanceof ApiError &&
      error.message === "Authentication is required" &&
      error.status === 401,
  )
})

test("api client forwards custom headers for server-side session reads", async () => {
  const requests: Array<{ init?: RequestInit; input: RequestInfo | URL }> = []
  const client = createApiClient({
    baseUrl: "http://127.0.0.1:8787",
    fetch: async (input, init) => {
      requests.push({ init, input })
      return Response.json({ ok: true })
    },
  })

  await client.getSession({
    headers: {
      cookie: "better-auth.session=abc123",
    },
  })

  assert.equal(String(requests[0]?.input), "http://127.0.0.1:8787/v1/session")
  assert.equal(
    (requests[0]?.init?.headers as Record<string, string> | undefined)?.cookie,
    "better-auth.session=abc123",
  )
  assert.equal(requests[0]?.init?.credentials, "include")
})
