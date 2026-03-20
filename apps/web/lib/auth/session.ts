import { ApiError, type ApiSession, createApiClient } from "../api/client"

type SessionApiClient = Pick<ReturnType<typeof createApiClient>, "getSession">

function getForwardedSessionHeaders(requestHeaders: Headers): HeadersInit | undefined {
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return undefined
  }

  return {
    cookie,
  }
}

export async function getServerSession(
  requestHeaders: Headers,
  apiClient: SessionApiClient = createApiClient(),
): Promise<ApiSession | null> {
  try {
    return await apiClient.getSession({
      headers: getForwardedSessionHeaders(requestHeaders),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}
