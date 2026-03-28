import { headers } from "next/headers"

import { GitHubInstallationCallback } from "@/components/dashboard/github-installation-callback"
import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { DashboardPage } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"

export default async function GitHubInstallationCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  const resolvedSearchParams = await searchParams
  const rawInstallationId = resolvedSearchParams.installation_id
  const rawState = resolvedSearchParams.state
  const installationId = Array.isArray(rawInstallationId)
    ? rawInstallationId[0] ?? null
    : rawInstallationId ?? null
  const state = Array.isArray(rawState) ? rawState[0] ?? null : rawState ?? null

  return (
    <DashboardPage>
      <GitHubInstallationCallback
        installationId={installationId}
        state={state}
        workspaceId={accessState.workspace.workspace.id}
      />
    </DashboardPage>
  )
}
