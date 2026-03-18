import { PackageCheckIcon, ShieldCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-medium">Release Dashboard</h1>
              <Badge variant="outline">Sample workspace</Badge>
            </div>
            <p className="hidden truncate text-sm text-muted-foreground md:block">
              Track release context, claim checks, approvals, and publish packs from one
              operational surface.
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm">
            <ShieldCheckIcon data-icon="inline-start" />
            Open approvals
          </Button>
          <Button variant="secondary" size="sm">
            <PackageCheckIcon data-icon="inline-start" />
            Export pack
          </Button>
        </div>
      </div>
    </header>
  )
}
