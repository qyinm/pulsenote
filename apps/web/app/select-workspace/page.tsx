import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { WorkspaceSelectionCard } from "@/components/onboarding/workspace-selection-card"
import { createApiClient } from "@/lib/api/client"
import { getForwardedAuthHeaders } from "@/lib/auth/headers"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"

export default async function SelectWorkspacePage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind === "signed-out") {
    redirect("/auth/sign-in")
  }

  if (accessState.kind === "no-workspace") {
    redirect("/onboarding")
  }

  const apiClient = createApiClient()
  const choices = await apiClient.listWorkspaceChoices({
    headers: getForwardedAuthHeaders(requestHeaders),
  })

  if (choices.length <= 1) {
    redirect("/dashboard/release-context")
  }

  return <WorkspaceSelectionCard choices={choices} />
}
