import type { ReleaseWorkflowHistoryEntry } from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"

type ReviewLogApiClient = Pick<ReturnType<typeof createApiClient>, "listReleaseWorkflowHistory">

export type ReviewLogMetrics = {
  blockedEvents: number
  loggedDecisions: number
  reopenedItems: number
  signedOffEvents: number
}

export async function getServerReviewLogData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReviewLogApiClient = createApiClient(),
) {
  return apiClient.listReleaseWorkflowHistory(workspaceId, {
    headers: getForwardedAuthHeaders(requestHeaders),
  })
}

export function buildReviewLogMetrics(
  entries: ReleaseWorkflowHistoryEntry[],
): ReviewLogMetrics {
  return {
    blockedEvents: entries.filter((entry) => entry.outcome === "blocked").length,
    loggedDecisions: entries.length,
    reopenedItems: entries.filter((entry) => entry.eventType === "draft_reopened").length,
    signedOffEvents: entries.filter((entry) => entry.outcome === "signed_off").length,
  }
}
