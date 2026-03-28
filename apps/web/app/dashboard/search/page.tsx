import { headers } from "next/headers"
import {
  DatabaseZapIcon,
  SearchIcon,
  ShieldAlertIcon,
  BellRingIcon,
} from "lucide-react"

import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { SearchWorkspace } from "@/components/dashboard/search-workspace"
import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerLiveSearchData } from "@/lib/search"

export default async function SearchPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let searchData: Awaited<ReturnType<typeof getServerLiveSearchData>> | null = null
  let isUnavailable = false

  try {
    searchData = await getServerLiveSearchData(
      requestHeaders,
      accessState.workspace.workspace.id,
      accessState.session.user.id,
    )
  } catch (error) {
    isUnavailable = true
    console.error("Failed to load dashboard search", error)
  }

  if (isUnavailable || !searchData) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Search is unavailable"
          description="Live release workflow records could not be loaded right now."
        >
          <p className="text-sm text-muted-foreground">
            Try again after the current request completes or check back once the workspace data is available.
          </p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Indexed entities"
          value={String(searchData.metrics.indexedRecords)}
          detail="Live release workflow scope"
          description="Search stays inside release records, evidence, approvals, review history, and active review signals."
          badge="Live"
          icon={SearchIcon}
        />
        <MetricCard
          title="Blocked entities"
          value={String(searchData.metrics.blockedResults)}
          detail="Need immediate review"
          description="Search keeps blocked workflow state visible without navigating through every page."
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Evidence sources"
          value={String(searchData.metrics.evidenceSources)}
          detail="Proof stays discoverable"
          description="Source proof remains searchable before a claim is drafted, approved, or exported."
          icon={DatabaseZapIcon}
        />
        <MetricCard
          title="Review signals"
          value={String(searchData.metrics.reviewSignals)}
          detail="Inbox-linked cues"
          description="Reopened drafts, blocked claim checks, and pending approvals remain searchable as active signals."
          icon={BellRingIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <SearchWorkspace
            initialResults={searchData.results}
            suggestedQueries={searchData.suggestedQueries}
          />
        }
        aside={
          <>
            <SurfaceCard
              title="Suggested queries"
              description="Operational shortcuts stay scoped to the release communication workflow."
            >
              <BulletList items={searchData.suggestedQueries} />
            </SurfaceCard>

            <SurfaceCard
              title="Search scope"
              description="Search is intentionally scoped to the release workflow, not broad content authoring."
            >
              <InlineList
                items={[
                  { label: "Includes", value: "Releases, approvals, evidence, review history, inbox signals" },
                  { label: "Excludes", value: "Generic content drafts, template libraries, and social planning" },
                  { label: "Result style", value: "Actionable records with route links" },
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
