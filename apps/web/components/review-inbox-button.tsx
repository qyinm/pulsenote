"use client"

import Link from "next/link"
import { InboxIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { inboxQueueBadge } from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ReviewInboxButton() {
  const pathname = usePathname()
  const isActive = pathname === "/dashboard/inbox"

  return (
    <Link
      href="/dashboard/inbox"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          size: "default",
          variant: isActive ? "secondary" : "outline",
        }),
        "h-8 shrink-0 gap-2 px-2.5 group-data-[collapsible=icon]:hidden"
      )}
    >
      <InboxIcon data-icon="inline-start" />
      <span>Inbox</span>
      <Badge variant={isActive ? "outline" : "secondary"}>{inboxQueueBadge}</Badge>
    </Link>
  )
}
