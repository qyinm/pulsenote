import { headers } from "next/headers"
import {
  BellIcon,
  FileCogIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react"

import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { GitHubConnectionSettingsCard } from "@/components/dashboard/github-connection-settings-card"
import {
  DashboardPage,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerSettingsData } from "@/lib/dashboard/settings"
import { getServerReleaseContextGitHubState } from "@/lib/dashboard/release-context"

export default async function SettingsPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let githubState: Awaited<ReturnType<typeof getServerReleaseContextGitHubState>> = {
    connection: null,
    installUrl: null,
  }
  let githubStateError: string | null = null
  let settingsData: Awaited<ReturnType<typeof getServerSettingsData>> | null = null
  let settingsUnavailable = false

  try {
    githubState = await getServerReleaseContextGitHubState(
      requestHeaders,
      accessState.workspace.workspace.id,
    )
  } catch (error) {
    githubStateError =
      error instanceof Error
        ? error.message
        : "GitHub connection settings could not be loaded from the authenticated API."
  }

  try {
    settingsData = await getServerSettingsData(
      requestHeaders,
      accessState.workspace,
      accessState.session.user.id,
    )
  } catch (error) {
    settingsUnavailable = true
    console.error(
      "Failed to load live settings data",
      error instanceof Error ? error.message : "Unknown error",
    )
  }

  const metrics = settingsData?.metrics ?? {
    activeIntegrations: 0,
    activeMembers: 0,
    openReviewSignals: 0,
    readyToExport: 0,
  }
  const liveSections = settingsData
    ? [
        settingsData.workspaceProfile,
        settingsData.reviewPolicy,
        settingsData.notifications,
        settingsData.exportReadiness,
      ]
    : []

  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Workspace members"
          value={String(metrics.activeMembers)}
          detail="Live workspace roster"
          description="Settings stay anchored to the release workspace that owns reviewer handoff and publish decisions."
          badge="Live"
          icon={Settings2Icon}
        />
        <MetricCard
          title="Active integrations"
          value={String(metrics.activeIntegrations)}
          detail="Connected release sources"
          description="Connected source systems define how release evidence and sync coverage enter the workspace."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Open review signals"
          value={String(metrics.openReviewSignals)}
          detail="Inbox-visible handoffs"
          description="Notification coverage stays tied to live blocked states, approvals, and reopened drafts."
          icon={BellIcon}
        />
        <MetricCard
          title="Ready to export"
          value={String(metrics.readyToExport)}
          detail="Publish-pack candidates"
          description="Export readiness stays explicit so publish packs only move forward once review and evidence are aligned."
          icon={FileCogIcon}
        />
      </MetricGrid>

      {githubStateError ? (
        <SurfaceCard
          title="GitHub settings are unavailable"
          description="PulseNote could not load the current GitHub connection state right now."
        >
          <p className="text-sm text-muted-foreground">
            Try again after the current request completes or check back once the workspace data is available.
          </p>
        </SurfaceCard>
      ) : null}

      <GitHubConnectionSettingsCard
        initialGitHubConnection={githubState.connection}
        initialGitHubInstallUrl={githubState.installUrl}
        workspaceId={accessState.workspace.workspace.id}
      />

      {settingsUnavailable ? (
        <SurfaceCard
          title="Workspace settings are unavailable"
          description="Live workflow settings could not be loaded right now."
        >
          <p className="text-sm text-muted-foreground">
            Try again after the current request completes or check back once the workspace data is available.
          </p>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {liveSections.map((section) => (
          <SurfaceCard
            key={section.title}
            title={section.title}
            description={section.description}
          >
            <InlineList items={section.items} />
          </SurfaceCard>
        ))}
      </div>
    </DashboardPage>
  )
}
