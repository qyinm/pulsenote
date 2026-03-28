import { headers } from "next/headers"

import { ReviewInboxWorkspace } from "@/components/dashboard/review-inbox-workspace"
import {
  DashboardAccessState,
  type DashboardAccessStateKind,
} from "@/components/dashboard/dashboard-access-state"
import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerReviewInboxData } from "@/lib/review-inbox"

function renderInboxAccessFallback(state: DashboardAccessStateKind) {
  return <DashboardAccessState state={state} />
}

export default async function InboxPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return renderInboxAccessFallback(accessState.kind)
  }

  let inboxData: Awaited<ReturnType<typeof getServerReviewInboxData>> | null = null
  let errorMessage: string | null = null

  try {
    inboxData = await getServerReviewInboxData(
      requestHeaders,
      accessState.workspace.workspace.id,
      accessState.session.user.id,
    )
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The authenticated inbox request failed before review notifications could be rendered."
  }

  if (errorMessage) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Inbox is unavailable"
          description="The authenticated API request failed before in-product review notifications could be rendered."
        >
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </SurfaceCard>
      </DashboardPage>
    )
  }

  return (
    <div className="flex h-[calc(100dvh_-_var(--header-height))] min-h-0 overflow-hidden md:h-[calc(100dvh_-_var(--header-height)_-_1rem)]">
      <ReviewInboxWorkspace initialItems={inboxData?.items ?? []} />
    </div>
  )
}
