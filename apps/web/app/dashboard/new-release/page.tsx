import { headers } from "next/headers"

import {
  DashboardAccessState,
  type DashboardAccessStateKind,
} from "@/components/dashboard/dashboard-access-state"
import { NewReleaseLiveWorkspace } from "@/components/dashboard/new-release-live-workspace"
import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import {
  getServerReleaseContextData,
  getServerReleaseContextGitHubState,
} from "@/lib/dashboard/release-context"

function renderNewReleaseAccessFallback(state: DashboardAccessStateKind) {
  return <DashboardAccessState state={state} />
}

export default async function NewReleasePage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return renderNewReleaseAccessFallback(accessState.kind)
  }

  let releaseContextData: Awaited<ReturnType<typeof getServerReleaseContextData>> | null = null
  let githubState: Awaited<ReturnType<typeof getServerReleaseContextGitHubState>> = {
    connection: null,
    installUrl: null,
  }
  try {
    githubState = await getServerReleaseContextGitHubState(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    console.error("New release page could not load the GitHub connection state.", error)
    return (
      <DashboardPage>
        <SurfaceCard
          title="New release is unavailable"
          description="The authenticated API request failed before the release scope builder could be rendered."
        >
          <p className="text-sm text-muted-foreground">
            Refresh the page or reopen the release workspace after the authenticated API is available again.
          </p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  try {
    releaseContextData = await getServerReleaseContextData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    console.error("New release page could not load recent release context data.", error)
  }

  return (
    <DashboardPage>
      <NewReleaseLiveWorkspace
        initialGitHubConnection={githubState.connection}
        initialGitHubInstallUrl={githubState.installUrl}
        recentReleasesUnavailable={releaseContextData === null}
        recentReleaseRecords={releaseContextData?.releaseRecords ?? []}
        workspaceId={accessState.workspace.workspace.id}
      />
    </DashboardPage>
  )
}
