"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { getDashboardRoute } from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SiteHeader({
  workspaceLabel,
}: {
  workspaceLabel?: string | null
}) {
  const pathname = usePathname()
  const route = getDashboardRoute(pathname)

  if (!route) {
    return null
  }

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-medium">{route.title}</h1>
              {workspaceLabel ? <Badge variant="outline">{workspaceLabel}</Badge> : null}
            </div>
            <p className="hidden truncate text-sm text-muted-foreground md:block">
              {route.description}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {route.primaryAction ? (
            <Link
              href={route.primaryAction.href}
              className={cn(
                buttonVariants({
                  variant: route.primaryAction.variant ?? "outline",
                  size: "sm",
                })
              )}
            >
              <route.primaryAction.icon data-icon="inline-start" />
              {route.primaryAction.label}
            </Link>
          ) : null}
          {route.secondaryAction ? (
            <Link
              href={route.secondaryAction.href}
              className={cn(
                buttonVariants({
                  variant: route.secondaryAction.variant ?? "secondary",
                  size: "sm",
                })
              )}
            >
              <route.secondaryAction.icon data-icon="inline-start" />
              {route.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
