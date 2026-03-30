import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { WorkspaceOnboardingCard } from "@/components/onboarding/workspace-onboarding-card"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"

export default async function OnboardingPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind === "signed-out") {
    redirect("/auth/sign-in")
  }

  if (accessState.kind === "ready") {
    redirect("/dashboard/new-release")
  }

  if (accessState.kind === "workspace-selection-required") {
    redirect("/dashboard")
  }

  return <WorkspaceOnboardingCard />
}
