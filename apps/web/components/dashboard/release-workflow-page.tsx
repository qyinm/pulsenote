import { headers } from "next/headers"

import {
  DashboardAccessState,
  type DashboardAccessStateKind,
} from "@/components/dashboard/dashboard-access-state"
import { ReleaseWorkflowLiveWorkspace } from "@/components/dashboard/release-workflow-live-workspace"
import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerReleaseWorkflowData } from "@/lib/release-workflow"

type ReleaseWorkflowMode = "approval" | "claim_check" | "overview" | "publish_pack"

type ReleaseWorkflowPageProps = {
  emptyDescription: string
  emptyTitle: string
  mode: ReleaseWorkflowMode
  unavailableDescription: string
  unavailableTitle: string
}

export function renderReleaseWorkflowAccessFallback(state: DashboardAccessStateKind) {
  return <DashboardAccessState state={state} />
}

export async function ReleaseWorkflowPage({
  emptyDescription,
  emptyTitle,
  mode,
  unavailableDescription,
  unavailableTitle,
}: ReleaseWorkflowPageProps) {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return renderReleaseWorkflowAccessFallback(accessState.kind)
  }

  let workflowData: Awaited<ReturnType<typeof getServerReleaseWorkflowData>> | null = null
  let errorMessage: string | null = null

  try {
    workflowData = await getServerReleaseWorkflowData(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Founder release workflow could not be loaded from the authenticated API."
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

  if (!workflowData?.selectedId || !workflowData.selectedWorkflow) {
    return (
      <DashboardPage>
        <SurfaceCard title={emptyTitle} description={emptyDescription}>
          <p className="text-sm text-muted-foreground">
            Ingest release context from GitHub before trying to draft, review, or export customer-facing notes.
          </p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <ReleaseWorkflowLiveWorkspace
        initialWorkflow={workflowData.workflow}
        initialSelectedId={workflowData.selectedId}
        initialSelectedWorkflow={workflowData.selectedWorkflow}
        mode={mode}
        workspaceId={accessState.workspace.workspace.id}
      />
    </DashboardPage>
  )
}
