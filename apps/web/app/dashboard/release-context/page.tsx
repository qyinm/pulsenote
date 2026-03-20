import { headers } from "next/headers"

import { ReleaseContextLiveWorkspace } from "@/components/dashboard/release-context-live-workspace"
import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerReleaseContextData } from "@/lib/dashboard/release-context"

export default async function ReleaseContextPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return null
  }

  let releaseContextData: Awaited<ReturnType<typeof getServerReleaseContextData>> | null = null
  let errorMessage: string | null = null

  try {
    releaseContextData = await getServerReleaseContextData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Release context could not be loaded from the authenticated API."
  }

  if (errorMessage) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Release context is unavailable"
          description="The authenticated API request failed before the release intake queue could be rendered."
        >
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  if (!releaseContextData?.selectedId || !releaseContextData.selectedReleaseRecord) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="No release context in queue"
          description="New release intake records will appear here once authenticated GitHub evidence is ingested."
        >
          <p className="text-sm text-muted-foreground">
            Connect a release intake sync to start reviewing evidence, claims, and handoff state.
          </p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <ReleaseContextLiveWorkspace
        initialReleaseRecords={releaseContextData.releaseRecords}
        initialSelectedId={releaseContextData.selectedId}
        initialSelectedReleaseRecord={releaseContextData.selectedReleaseRecord}
        workspaceId={accessState.workspace.workspace.id}
      />
    </DashboardPage>
  )
}
