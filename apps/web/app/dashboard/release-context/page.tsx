import { headers } from "next/headers"

import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { ReleaseContextLiveWorkspace } from "@/components/dashboard/release-context-live-workspace"
import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import {
  getServerReleaseContextData,
  getServerReleaseContextGitHubState,
} from "@/lib/dashboard/release-context"

type ReleaseContextPageCopy = {
  unavailableDescription: string
  unavailableTitle: string
}

export async function ReleaseContextPageContent({
  unavailableDescription,
  unavailableTitle,
}: ReleaseContextPageCopy) {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let releaseContextData: Awaited<ReturnType<typeof getServerReleaseContextData>> | null = null
  let githubState: Awaited<ReturnType<typeof getServerReleaseContextGitHubState>> = {
    connection: null,
    installUrl: null,
  }
  let errorMessage: string | null = null

  try {
    githubState = await getServerReleaseContextGitHubState(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
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
        <SurfaceCard title={unavailableTitle} description={unavailableDescription}>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <ReleaseContextLiveWorkspace
        initialGitHubConnection={githubState.connection}
        initialGitHubInstallUrl={githubState.installUrl}
        initialReleaseRecords={releaseContextData?.releaseRecords ?? []}
        initialSelectedId={releaseContextData?.selectedId ?? null}
        initialSelectedReleaseRecord={releaseContextData?.selectedReleaseRecord ?? null}
        workspaceId={accessState.workspace.workspace.id}
      />
    </DashboardPage>
  )
}

export default async function ReleaseContextPage() {
  return (
    <ReleaseContextPageContent
      unavailableTitle="Release context is unavailable"
      unavailableDescription="The authenticated API request failed before the release intake queue could be rendered."
    />
  )
}
