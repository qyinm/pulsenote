import { headers } from "next/headers"
import Link from "next/link"
import {
  CircleHelpIcon,
  FileStackIcon,
  LifeBuoyIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerHelpCenterData } from "@/lib/help-center"

export default async function HelpPage() {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)

  if (accessState.kind !== "ready") {
    return <DashboardAccessState state={accessState.kind} />
  }

  let helpData: Awaited<ReturnType<typeof getServerHelpCenterData>> | null = null
  let isUnavailable = false

  try {
    helpData = await getServerHelpCenterData(
      requestHeaders,
      accessState.workspace,
      accessState.session.user.id,
    )
  } catch (error) {
    isUnavailable = true
    console.error(
      "Failed to load help center",
      error instanceof Error ? error.message : "Unknown error",
    )
  }

  if (isUnavailable || !helpData) {
    return (
      <DashboardPage>
        <SurfaceCard
          title="Help center is unavailable"
          description="Live operational guidance could not be loaded right now."
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
          title="Workflow guides"
          value={String(helpData.metrics.workflowGuides)}
          detail="Operational playbooks"
          description="Help guidance mirrors the real release workflow instead of expanding into generic AI help."
          badge="Live"
          icon={CircleHelpIcon}
        />
        <MetricCard
          title="Known limits"
          value={String(helpData.metrics.knownLimits)}
          detail="Visible before misuse"
          description="Operational blockers and missing handoffs stay visible so users do not confuse the workflow state with wishful progress."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Workflow coverage"
          value={`${helpData.metrics.activeStages}/5`}
          detail="Stages active in this workspace"
          description="Coverage reflects how much of the release communication workflow is currently active in live records."
          icon={FileStackIcon}
        />
        <MetricCard
          title="Support routing"
          value={String(helpData.metrics.openSignals)}
          detail="Open operational signals"
          description="Inbox-visible review pressure tells the team where to intervene next."
          icon={LifeBuoyIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {helpData.modules.map((module) => (
                <SurfaceCard
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  action={<Badge variant="outline">{module.status}</Badge>}
                >
                  <Link
                    href={module.href}
                    className="inline-flex h-7 w-fit items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Open page
                  </Link>
                </SurfaceCard>
              ))}
            </div>

            <SurfaceCard
              title="Workflow guide"
              description="A live operational checklist for moving the current workspace toward a reviewable publish handoff."
            >
              <BulletList items={helpData.checklist} />
            </SurfaceCard>
          </>
        }
        aside={
          <div className="grid gap-4">
            {helpData.issues.length > 0 ? helpData.issues.map((issue) => (
              <Alert key={issue.id} variant={issue.severity}>
                <AlertTitle>{issue.title}</AlertTitle>
                <AlertDescription>{issue.description}</AlertDescription>
              </Alert>
            )) : (
              <SurfaceCard
                title="No active workflow limits"
                description="The current workspace does not show blocked signals or missing handoffs right now."
              >
                <p className="text-sm text-muted-foreground">
                  Keep using release context, review log, and publish pack surfaces to preserve that state as the next release moves through the system.
                </p>
              </SurfaceCard>
            )}
          </div>
        }
      />
    </DashboardPage>
  )
}
