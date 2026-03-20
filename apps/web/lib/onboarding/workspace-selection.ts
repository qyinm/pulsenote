import { createApiClient, type WorkspaceSnapshot } from "../api/client"

type WorkspaceSelectionApiClient = Pick<ReturnType<typeof createApiClient>, "setCurrentWorkspace">

export async function selectCurrentWorkspace(
  payload: {
    workspaceId: string
  },
  apiClient: WorkspaceSelectionApiClient = createApiClient(),
): Promise<WorkspaceSnapshot> {
  return apiClient.setCurrentWorkspace({
    workspaceId: payload.workspaceId,
  })
}
