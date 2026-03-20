import { ApiError, type ApiSession, createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "./headers"

type SessionApiClient = Pick<ReturnType<typeof createApiClient>, "getSession">

export async function getServerSession(
  requestHeaders: Headers,
  apiClient: SessionApiClient = createApiClient(),
): Promise<ApiSession | null> {
  try {
    return await apiClient.getSession({
      headers: getForwardedAuthHeaders(requestHeaders),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}
