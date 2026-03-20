import { createApiClient, type WorkspaceSnapshot } from "../api/client"

type WorkspaceSelectionApiClient = Pick<ReturnType<typeof createApiClient>, "setCurrentWorkspace">
type WorkspaceSelectionChoice = {
  workspace: {
    id: string
  } & Record<string, unknown>
} & Record<string, unknown>

export type WorkspaceSelectionState =
  | { kind: "empty" }
  | { kind: "ready"; selectedWorkspaceId: string }

export function resolveWorkspaceSelectionState(
  choices: WorkspaceSelectionChoice[],
  currentWorkspaceId?: string,
): WorkspaceSelectionState {
  if (choices.length === 0) {
    return { kind: "empty" }
  }

  const normalizedCurrentWorkspaceId = currentWorkspaceId?.trim()

  if (normalizedCurrentWorkspaceId) {
    const matchingChoice = choices.find((choice) => choice.workspace.id === normalizedCurrentWorkspaceId)

    if (matchingChoice) {
      return {
        kind: "ready",
        selectedWorkspaceId: matchingChoice.workspace.id,
      }
    }
  }

  return {
    kind: "ready",
    selectedWorkspaceId: choices[0].workspace.id,
  }
}

export async function selectCurrentWorkspace(
  payload: {
    workspaceId: string
  },
  apiClient: WorkspaceSelectionApiClient = createApiClient(),
): Promise<WorkspaceSnapshot> {
  const workspaceId = payload.workspaceId.trim()

  if (!workspaceId) {
    throw new Error("Choose a workspace before continuing.")
  }

  return apiClient.setCurrentWorkspace({
    workspaceId,
  })
}
