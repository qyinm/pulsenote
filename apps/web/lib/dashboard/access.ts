import { ApiError, type ApiSession, type WorkspaceSnapshot, createApiClient } from "../api/client"
import { getServerSession } from "../auth/session"

type CurrentWorkspaceApiClient = Pick<ReturnType<typeof createApiClient>, "getCurrentWorkspace">
type DashboardAccessDependencies = {
  getCurrentWorkspace: (requestHeaders: Headers) => Promise<WorkspaceSnapshot | null>
  getSession: (requestHeaders: Headers) => Promise<ApiSession | null>
}

function getForwardedAuthHeaders(requestHeaders: Headers): HeadersInit | undefined {
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return undefined
  }

  return {
    cookie,
  }
}

export type DashboardAccessState =
  | { kind: "signed-out" }
  | { kind: "no-workspace"; session: ApiSession }
  | { kind: "ready"; session: ApiSession; workspace: WorkspaceSnapshot }

export async function getServerCurrentWorkspace(
  requestHeaders: Headers,
  apiClient: CurrentWorkspaceApiClient = createApiClient(),
): Promise<WorkspaceSnapshot | null> {
  try {
    return await apiClient.getCurrentWorkspace({
      headers: getForwardedAuthHeaders(requestHeaders),
    })
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return null
    }

    throw error
  }
}

export async function resolveDashboardAccessState(
  requestHeaders: Headers,
  dependencies: DashboardAccessDependencies = {
    getCurrentWorkspace: (headers) => getServerCurrentWorkspace(headers),
    getSession: (headers) => getServerSession(headers),
  },
): Promise<DashboardAccessState> {
  const session = await dependencies.getSession(requestHeaders)

  if (!session) {
    return { kind: "signed-out" }
  }

  const workspace = await dependencies.getCurrentWorkspace(requestHeaders)

  if (!workspace) {
    return {
      kind: "no-workspace",
      session,
    }
  }

  return {
    kind: "ready",
    session,
    workspace,
  }
}
