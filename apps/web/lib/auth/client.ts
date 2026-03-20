import { createAuthClient } from "better-auth/react"

import { getApiBaseUrl } from "../api/client"

type AuthRuntimeEnv = {
  NEXT_PUBLIC_API_BASE_URL?: string | undefined
}

type CreateAuthClientImplementation = typeof createAuthClient

export function getAuthClientBaseUrl(env?: AuthRuntimeEnv | NodeJS.ProcessEnv) {
  return env ? getApiBaseUrl(env) : getApiBaseUrl()
}

export function createPulseNoteAuthClient(
  createAuthClientImplementation: CreateAuthClientImplementation = createAuthClient,
  env?: AuthRuntimeEnv | NodeJS.ProcessEnv,
) {
  return createAuthClientImplementation({
    baseURL: getAuthClientBaseUrl(env),
    fetchOptions: {
      credentials: "include",
    },
  })
}

export const authClient = createPulseNoteAuthClient()
export type AuthClientType = typeof authClient
