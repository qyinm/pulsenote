import type { CSSProperties } from "react"
import { headers } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardAccessState } from "@/components/dashboard/dashboard-access-state"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { resolveDashboardAccessState } from "@/lib/dashboard/access"

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
        : null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "4rem",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="min-h-0">
        <SiteHeader workspaceLabel={workspaceLabel} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {accessState.kind === "ready" ? children : <DashboardAccessState state={accessState.kind} />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
