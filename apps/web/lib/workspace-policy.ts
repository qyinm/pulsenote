import { ApiError, type WorkspacePolicySettings } from "./api/client"

export function createDefaultWorkspacePolicySettings(
  workspaceId = "",
): WorkspacePolicySettings {
  const timestamp = new Date().toISOString()

  return {
    createdAt: timestamp,
    includeEvidenceLinksInExport: true,
    includeSourceLinksInExport: true,
    requireReviewerAssignment: true,
    showBlockedClaimsInInbox: true,
    showPendingApprovalsInInbox: true,
    showReopenedDraftsInInbox: true,
    updatedAt: timestamp,
    workspaceId,
  }
}

export function isWorkspacePolicyFallbackError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 404 || error.status === 503)
}

export async function getWorkspacePolicySettingsOrDefault(
  workspaceId: string,
  load: () => Promise<WorkspacePolicySettings>,
) {
  try {
    return await load()
  } catch (error) {
    if (isWorkspacePolicyFallbackError(error)) {
      return createDefaultWorkspacePolicySettings(workspaceId)
    }

    throw error
  }
}
