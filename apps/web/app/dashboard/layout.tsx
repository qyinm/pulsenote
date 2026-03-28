import type { CSSProperties } from "react"
import { headers } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"
import { getServerReviewInboxData } from "@/lib/review-inbox"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const accessState = await resolveDashboardAccessState(requestHeaders)
  const workspaceLabel =
    accessState.kind === "ready"
      ? accessState.workspace.workspace.name
      : accessState.kind === "no-workspace"
        ? "No workspace"
        : accessState.kind === "workspace-selection-required"
          ? "Select workspace"
        : null
  const sidebarUser =
    accessState.kind === "signed-out"
      ? null
      : {
          avatar: accessState.session.user.image ?? undefined,
          email: accessState.session.user.email,
          name: accessState.session.user.name,
        }
  let inboxBadge: string | null = null

  if (accessState.kind === "ready") {
    try {
      const inboxData = await getServerReviewInboxData(
        requestHeaders,
        accessState.workspace.workspace.id,
        accessState.session.user.id,
      )
      inboxBadge = inboxData.count > 0 ? String(inboxData.count) : null
    } catch (error) {
      console.error("Failed to fetch inbox data for badge:", error)
      inboxBadge = null
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "4rem",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" inboxBadge={inboxBadge} user={sidebarUser} />
      <SidebarInset className="min-h-0">
        <SiteHeader workspaceLabel={workspaceLabel} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {accessState.kind === "ready" ? children : <DashboardAccessState state={accessState.kind} />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
