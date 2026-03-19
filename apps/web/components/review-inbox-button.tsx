"use client"

import Link from "next/link"
import { InboxIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { inboxQueueBadge } from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function ReviewInboxButton({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === "/dashboard/inbox"

  if (compact) {
    return (
      <SidebarMenuButton
        tooltip={`Inbox ${inboxQueueBadge}`}
        render={<Link href="/dashboard/inbox" />}
        isActive={isActive}
      >
        <InboxIcon data-icon="inline-start" />
        <span>Inbox</span>
      </SidebarMenuButton>
    )
  }

  return (
    <Link
      href="/dashboard/inbox"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          size: "default",
          variant: isActive ? "secondary" : "outline",
        }),
        "h-8 w-full justify-start gap-2 px-2.5 group-data-[collapsible=icon]:hidden"
      )}
    >
      <InboxIcon data-icon="inline-start" />
      <span>Inbox</span>
      <Badge variant={isActive ? "outline" : "secondary"}>{inboxQueueBadge}</Badge>
    </Link>
  )
}
